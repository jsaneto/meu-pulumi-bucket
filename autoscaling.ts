import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { ec2ASG1Type, ec2Architecture, asgMin, asgMax, cpuThreshold } from "./variables";
import { createLoadBalancer } from "./loadbalancer";

export const createAutoScalingGroup = (securityGroupId: pulumi.Output<string>) => {
    
    // 1. VPC e Subnets
    const vpc = aws.ec2.getVpc({ default: true });
    const subnets = vpc.then(v => aws.ec2.getSubnets({
        filters: [
            { name: "vpc-id", values: [v.id] },
            { 
                name: "availability-zone", 
                values: ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d"] 
            }
        ],
    }));

    // 2. Load Balancer
    const lb = createLoadBalancer(
        vpc.then(v => v.id), 
        subnets.then(s => s.ids), 
        securityGroupId
    );

    // 3. AMI
    const ami = aws.ec2.getAmi({
        filters: [{ 
            name: "name", 
            values: [`ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-${ec2Architecture}-server-*`] 
        }],
        owners: ["099720109477"],
        mostRecent: true,
    });

    // 4. User Data
    const userData = `#!/bin/bash
sudo apt-get update
sudo apt-get install -y apache2
sudo systemctl start apache2
sudo systemctl enable apache2
echo "<h1>Servidor Graviton Spot: $(hostname)</h1>" > /var/www/html/index.html`;

    // 5. Launch Template
    const launchTemplate = new aws.ec2.LaunchTemplate("asg-template", {
        namePrefix: "asg-template-",
        imageId: ami.then(a => a.id),
        instanceType: ec2ASG1Type,
        vpcSecurityGroupIds: [securityGroupId],
        userData: Buffer.from(userData).toString("base64"),
        tagSpecifications: [{
            resourceType: "instance",
            tags: { 
                Name: "ASG-Node-Spot",
                Project: "Graviton-Spot-Cluster"
            },
        }],
    });

    // 6. Auto Scaling Group
    const asg = new aws.autoscaling.Group("meu-asg", {
        maxSize: asgMax,
        minSize: asgMin,
        desiredCapacity: asgMin,
        vpcZoneIdentifiers: subnets.then(s => s.ids), 
        targetGroupArns: [lb.targetGroupArn],
        healthCheckType: "ELB",
        healthCheckGracePeriod: 300,

        mixedInstancesPolicy: {
            instancesDistribution: {
                onDemandBaseCapacity: 0,
                onDemandPercentageAboveBaseCapacity: 0, 
                spotAllocationStrategy: "capacity-optimized",
            },
            launchTemplate: {
                launchTemplateSpecification: {
                    launchTemplateId: launchTemplate.id,
                    version: "$Latest",
                },
                overrides: [
                    { instanceType: "t4g.medium" },
                    { instanceType: "t4g.small" },
                    { instanceType: "t4g.large" },
                ],
            },
        },
    });

    // --- AGENDAMENTO CORRIGIDO (SEM START_TIME PASSADO) ---

    // Ligar: Seg-Sex às 09:00 BRT (12:00 UTC)
    new aws.autoscaling.Schedule("start-workday", {
        scheduledActionName: "start-workday",
        minSize: asgMin,
        maxSize: asgMax,
        desiredCapacity: asgMin,
        recurrence: "0 12 * * 1-5", 
        autoscalingGroupName: asg.name,
    });

    // Desligar: Seg-Sex às 22:00 BRT (01:00 UTC do dia seguinte)
    // 22h de segunda vira 01h de terça UTC (dias 2 a 6 da semana)
    new aws.autoscaling.Schedule("end-workday", {
        scheduledActionName: "end-workday",
        minSize: 0,
        maxSize: 0,
        desiredCapacity: 0,
        recurrence: "0 1 * * 2-6", 
        autoscalingGroupName: asg.name,
    });

    // 7. Política de Escalabilidade
    new aws.autoscaling.Policy("cpu-scaling-policy", {
        autoscalingGroupName: asg.name,
        policyType: "TargetTrackingScaling",
        targetTrackingConfiguration: {
            targetValue: cpuThreshold,
            predefinedMetricSpecification: {
                predefinedMetricType: "ASGAverageCPUUtilization",
            },
        },
    });

    return {
        asg: asg,
        lbDns: lb.albDnsName
    };
};
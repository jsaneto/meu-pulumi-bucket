import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { ec2ASG1Type, ec2Architecture, asgMin, asgMax, cpuThreshold } from "./variables";
import { createLoadBalancer } from "./loadbalancer";
import { setupSSMCloudWatchAgent } from "./ssm"; // Importando o novo arquivo

export const createAutoScalingGroup = (
    securityGroupId: pulumi.Output<string>,
    vpcId: pulumi.Input<string>,
    subnetIds: pulumi.Input<string[]>
) => {

    // --- CONFIGURAÇÃO DE PERMISSÕES (IAM) ---
    // Essencial para o SSM e CloudWatch Agent funcionarem
    const role = new aws.iam.Role("asg-ssm-role", {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ec2.amazonaws.com" }),
    });

    // Permite que a instância se comunique com o Systems Manager (SSM)
    new aws.iam.RolePolicyAttachment("ssm-managed-instance", {
        role: role.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    });

    // Permite que a instância envie métricas para o CloudWatch
    new aws.iam.RolePolicyAttachment("cw-agent-policy", {
        role: role.name,
        policyArn: "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
    });

    const instanceProfile = new aws.iam.InstanceProfile("asg-instance-profile", {
        role: role.name,
    });

    // --- INFRAESTRUTURA EXISTENTE ---

    const ami = aws.ec2.getAmi({
        filters: [{ 
            name: "name", 
            values: [`ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-${ec2Architecture}-server-*`] 
        }],
        owners: ["099720109477"],
        mostRecent: true,
    });

    const lb = createLoadBalancer(vpcId, subnetIds, securityGroupId);

    const userData = `#!/bin/bash
sudo apt-get update
sudo apt-get install -y apache2
sudo systemctl start apache2
sudo systemctl enable apache2
echo "<h1>Servidor Graviton Spot com CloudWatch Agent: $(hostname)</h1>" > /var/www/html/index.html`;

    // 5. Launch Template (Atualizado com iamInstanceProfile)
    const launchTemplate = new aws.ec2.LaunchTemplate("asg-template", {
        namePrefix: "asg-template-",
        imageId: ami.then(a => a.id),
        instanceType: ec2ASG1Type,
        iamInstanceProfile: { arn: instanceProfile.arn }, // <--- OBRIGATÓRIO PARA SSM
        vpcSecurityGroupIds: [securityGroupId],
        userData: Buffer.from(userData).toString("base64"),
        tagSpecifications: [{
            resourceType: "instance",
            tags: { 
                Name: "ASG-Node-Spot",
                Project: "Graviton-Spot-Cluster" // Tag usada pelo SSM para filtrar alvos
            },
        }],
    });

    // 6. Auto Scaling Group
    const asg = new aws.autoscaling.Group("meu-asg", {
        maxSize: asgMax,
        minSize: asgMin,
        desiredCapacity: asgMin,
        vpcZoneIdentifiers: subnetIds, 
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

    // --- ATIVAÇÃO DO CLOUDWATCH AGENT VIA SSM ---
    // Chamamos a função do arquivo ssm.ts passando as tags configuradas no Launch Template
    setupSSMCloudWatchAgent({
        projectName: "Project",
        projectValue: "Graviton-Spot-Cluster"
    });

    // --- POLÍTICAS E AGENDAMENTOS ---

    new aws.autoscaling.Schedule("start-workday", {
        scheduledActionName: "start-workday",
        minSize: asgMin,
        maxSize: asgMax,
        desiredCapacity: asgMin,
        recurrence: "0 12 * * 1-5",
        autoscalingGroupName: asg.name,
    });

    new aws.autoscaling.Schedule("end-workday", {
        scheduledActionName: "end-workday",
        minSize: 0,
        maxSize: 0,
        desiredCapacity: 0,
        recurrence: "0 1 * * 2-6", 
        autoscalingGroupName: asg.name,
    });

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
        lbDns: lb.albDnsName,
        lbArn: lb.albArn,
        lbZoneId: lb.albZoneId,
    };
};
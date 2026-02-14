import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { ec2ASG1Type, ec2Architecture, asgMin, asgMax, cpuThreshold } from "./variables";
import { createLoadBalancer } from "./loadbalancer";

/**
 * Cria um grupo de Auto Scaling (ASG) utilizando instâncias Spot e arquitetura ARM (Graviton).
 * param securityGroupId O ID do Security Group que permitirá tráfego para as instâncias.
 */
export const createAutoScalingGroup = (securityGroupId: pulumi.Output<string>) => {
    
    // 1. VPC e Subnets: Busca a infraestrutura de rede padrão da conta AWS
    const vpc = aws.ec2.getVpc({ default: true });
    const subnets = vpc.then(v => aws.ec2.getSubnets({
        filters: [
            { name: "vpc-id", values: [v.id] },
            { 
                // Filtra subnets em zonas específicas para garantir alta disponibilidade
                name: "availability-zone", 
                values: ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d"] 
            }
        ],
    }));

    // 2. Load Balancer: Instancia o balanceador de carga que distribuirá o tráfego entre as instâncias do ASG
    const lb = createLoadBalancer(
        vpc.then(v => v.id), 
        subnets.then(s => s.ids), 
        securityGroupId
    );

    // 3. AMI (Amazon Machine Image): Busca a imagem mais recente do Ubuntu 22.04 para a arquitetura definida (arm64)
    const ami = aws.ec2.getAmi({
        filters: [{ 
            name: "name", 
            values: [`ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-${ec2Architecture}-server-*`] 
        }],
        owners: ["099720109477"], // Owner ID oficial da Canonical (Ubuntu)
        mostRecent: true,
    });

    // 4. User Data: Script de inicialização que instala o Apache e configura uma página inicial simples
    const userData = `#!/bin/bash
sudo apt-get update
sudo apt-get install -y apache2
sudo systemctl start apache2
sudo systemctl enable apache2
echo "<h1>Servidor Graviton Spot: $(hostname)</h1>" > /var/www/html/index.html`;

    // 5. Launch Template: O "molde" que define as configurações das instâncias que o ASG vai criar
    const launchTemplate = new aws.ec2.LaunchTemplate("asg-template", {
        namePrefix: "asg-template-",
        imageId: ami.then(a => a.id),
        instanceType: ec2ASG1Type,
        vpcSecurityGroupIds: [securityGroupId],
        userData: Buffer.from(userData).toString("base64"), // O User Data precisa ser enviado em Base64
        tagSpecifications: [{
            resourceType: "instance",
            tags: { 
                Name: "ASG-Node-Spot",
                Project: "Graviton-Spot-Cluster"
            },
        }],
    });

    // 6. Auto Scaling Group: Gerencia o ciclo de vida das instâncias (criação, substituição e escala)
    const asg = new aws.autoscaling.Group("meu-asg", {
        maxSize: asgMax,
        minSize: asgMin,
        desiredCapacity: asgMin,
        vpcZoneIdentifiers: subnets.then(s => s.ids), 
        targetGroupArns: [lb.targetGroupArn], // Conecta o ASG ao Target Group do Load Balancer
        healthCheckType: "ELB", // Usa o Health Check do Load Balancer para saber se a instância está saudável
        healthCheckGracePeriod: 300, // Aguarda 5 minutos antes de verificar a saúde (tempo de boot)

        // Mixed Instances Policy: Permite misturar diferentes tipos de instâncias e focar em Spot
        mixedInstancesPolicy: {
            instancesDistribution: {
                onDemandBaseCapacity: 0, // 0 instâncias On-Demand fixas
                onDemandPercentageAboveBaseCapacity: 0, // 100% das instâncias extras serão Spot
                spotAllocationStrategy: "capacity-optimized", // Escolhe o pool Spot com menor chance de interrupção
            },
            launchTemplate: {
                launchTemplateSpecification: {
                    launchTemplateId: launchTemplate.id,
                    version: "$Latest",
                },
                // Overrides: Lista de instâncias compatíveis para aumentar a disponibilidade Spot
                overrides: [
                    { instanceType: "t4g.medium" },
                    { instanceType: "t4g.small" },
                    { instanceType: "t4g.large" },
                ],
            },
        },
    });

    // --- AGENDAMENTO DE HORÁRIOS (ECONOMIA DE CUSTO) ---

    // Ação Agendada para Ligar: Seg-Sex às 09:00 BRT (12:00 UTC)
    new aws.autoscaling.Schedule("start-workday", {
        scheduledActionName: "start-workday",
        minSize: asgMin,
        maxSize: asgMax,
        desiredCapacity: asgMin,
        recurrence: "0 12 * * 1-5", // Formato Cron: Minuto Hora Dia Mês Dia-da-Semana
        autoscalingGroupName: asg.name,
    });

    // Ação Agendada para Desligar: Seg-Sex às 22:00 BRT (01:00 UTC do dia seguinte)
    new aws.autoscaling.Schedule("end-workday", {
        scheduledActionName: "end-workday",
        minSize: 0,
        maxSize: 0,
        desiredCapacity: 0, // Reduz para zero para economizar durante a madrugada
        recurrence: "0 1 * * 2-6", 
        autoscalingGroupName: asg.name,
    });

    // 7. Política de Escalabilidade: Escala automaticamente baseada no uso real de CPU
    new aws.autoscaling.Policy("cpu-scaling-policy", {
        autoscalingGroupName: asg.name,
        policyType: "TargetTrackingScaling", // Tenta manter a métrica em um valor alvo
        targetTrackingConfiguration: {
            targetValue: cpuThreshold, // Valor alvo (ex: 50% de CPU)
            predefinedMetricSpecification: {
                predefinedMetricType: "ASGAverageCPUUtilization",
            },
        },
    });

    return {
        asg: asg,
        lbDns: lb.albDnsName // Exporta o DNS do Load Balancer para acesso externo
    };
};
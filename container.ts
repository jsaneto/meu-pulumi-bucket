import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

export const createContainerService = () => {
    const cluster = new aws.ecs.Cluster("meu-cluster");

    // 1. Cria o Grupo de Logs no CloudWatch
    const logGroup = new aws.cloudwatch.LogGroup("nginx-logs", {
        retentionInDays: 1, // Importante para sandbox: não acumula lixo
    });

    const alb = new awsx.lb.ApplicationLoadBalancer("lb-fargate", {});

    const fargateService = new awsx.ecs.FargateService("servico-nginx", {
        cluster: cluster.arn,
        desiredCount: 2,
        assignPublicIp: true,
        taskDefinitionArgs: {
            container: {
                name: "nginx-container",
                image: "nginx:latest",
                cpu: 256,
                memory: 512,
                portMappings: [{
                    containerPort: 80,
                    targetGroup: alb.defaultTargetGroup,
                }],
                // 2. Configura o logDriver para enviar logs ao CloudWatch
                logConfiguration: {
                    logDriver: "awslogs",
                    options: {
                        "awslogs-group": logGroup.name,
                        "awslogs-region": "us-east-1", // Ajuste para sua região do lab
                        "awslogs-stream-prefix": "nginx",
                    },
                },
                healthCheck: {
                    command: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"],
                    interval: 30,
                    timeout: 5,
                    retries: 3,
                },
            },
        },
    });

    return alb.loadBalancer.dnsName;
};
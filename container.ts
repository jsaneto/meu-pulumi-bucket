import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

export const createContainerService = () => {
    const cluster = new aws.ecs.Cluster("meu-cluster");

    // Cria o LB com configurações padrão (Internet-facing)
    const alb = new awsx.lb.ApplicationLoadBalancer("lb-fargate", {});

    const fargateService = new awsx.ecs.FargateService("servico-nginx", {
        cluster: cluster.arn,
        desiredCount: 2, // Garante alta disponibilidade (roda 2 containers)
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
            // Verifica se o container está saudável antes de mandar tráfego
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
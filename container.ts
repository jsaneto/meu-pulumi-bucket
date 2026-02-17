import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

/**
 * nada
 * Cria um serviço de containers gerenciado (ECS Fargate) com Load Balancer integrado.
 * Utiliza AWSX para simplificar a criação de VPCs, ALBs e definições de tarefas.
 */
export const createContainerService = () => {
    // Cria o Cluster ECS: O agrupamento lógico onde seus serviços de container residem.
    const cluster = new aws.ecs.Cluster("meu-cluster");

    // 1. Grupo de Logs no CloudWatch
    // Cria o lugar onde os logs de saída (stdout/stderr) do seu container serão armazenados.
    const logGroup = new aws.cloudwatch.LogGroup("nginx-logs", {
        retentionInDays: 1, // Sandbox: Deleta logs após 1 dia para evitar custos de armazenamento.
    });

    // 2. Load Balancer de Aplicação (ALB) via AWSX
    // O AWSX facilita muito aqui: ele cria o ALB, Listener e Target Group com um único comando.
    const alb = new awsx.lb.ApplicationLoadBalancer("lb-fargate", {});

    // 3. Serviço Fargate
    // Define como o container deve rodar: quantidade, rede e recursos.
    const fargateService = new awsx.ecs.FargateService("servico-nginx", {
        cluster: cluster.arn,
        desiredCount: 2, // Mantém sempre 2 instâncias do container rodando (Alta Disponibilidade).
        assignPublicIp: true, // Necessário se você estiver usando a VPC padrão sem NAT Gateway.
        
        // Definição da Tarefa (Task Definition)
        taskDefinitionArgs: {
            container: {
                name: "nginx-container",
                image: "nginx:latest", // Busca a imagem oficial mais recente do Docker Hub.
                cpu: 256, // 0.25 vCPU
                memory: 512, // 512 MB de RAM
                
                // Mapeamento de Portas: Conecta a porta 80 do container ao Load Balancer criado acima.
                portMappings: [{
                    containerPort: 80,
                    targetGroup: alb.defaultTargetGroup,
                }],

                // Configuração de Logs: Diz ao Docker para enviar logs para o CloudWatch.
                logConfiguration: {
                    logDriver: "awslogs",
                    options: {
                        "awslogs-group": logGroup.name,
                        "awslogs-region": "us-east-1", 
                        "awslogs-stream-prefix": "nginx",
                    },
                },

                // Verificação de Saúde (Container Health Check)
                // O próprio ECS verifica se o Nginx está respondendo internamente.
                healthCheck: {
                    command: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"],
                    interval: 30,
                    timeout: 5,
                    retries: 3,
                },
            },
        },
    });

    // Retorna o endereço DNS do Load Balancer para que possamos acessar o Nginx pelo navegador.
    return alb.loadBalancer.dnsName;
};
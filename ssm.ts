import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * Interface para definir os argumentos de configuração do SSM.
 * projectName: A chave da tag (ex: 'Project')
 * projectValue: O valor da tag (ex: 'Graviton-Spot-Cluster')
 */
interface SSMConfigArgs {
    projectName: string;
    projectValue: string;
}

export const setupSSMCloudWatchAgent = (args: SSMConfigArgs) => {
    
    // 1. Criar o parâmetro no SSM Parameter Store com a configuração do Agente.
    // Este JSON diz ao agente para coletar métricas de memória e disco que não vêm por padrão no CloudWatch.
    const cwAgentConfig = new aws.ssm.Parameter("cw-agent-config", {
        name: "AmazonCloudWatch-linux-custom",
        type: "String",
        description: "Configuração do CloudWatch Agent para instâncias Linux",
        value: JSON.stringify({
            metrics: {
                append_dimensions: {
                    AutoScalingGroupName: "${aws:ASGName}"
                },
                metrics_collected: {
                    mem: {
                        measurement: ["mem_used_percent"],
                        metrics_collection_interval: 60
                    },
                    disk: {
                        resources: ["/"],
                        measurement: ["used_percent"],
                        metrics_collection_interval: 60
                    }
                }
            }
        }),
    });

    // 2. Associação para INSTALAR o binário do CloudWatch Agent.
    // O State Manager do SSM garante que instâncias novas com a tag alvo recebam o pacote.
    const installAssociation = new aws.ssm.Association("install-cw-agent", {
        name: "AWS-ConfigureAWSPackage",
        targets: [{
            key: `tag:${args.projectName}`,
            values: [args.projectValue],
        }],
        parameters: {
            action: "Install",
            name: "AmazonCloudWatchAgent",
        },
    });

    // 3. Associação para CONFIGURAR e INICIAR o Agente usando o parâmetro criado no passo 1.
    new aws.ssm.Association("configure-cw-agent", {
        name: "AmazonCloudWatch-ManageAgent",
        targets: [{
            key: `tag:${args.projectName}`,
            values: [args.projectValue],
        }],
        parameters: {
            action: "configure",
            mode: "ec2",
            optionalConfigurationSource: "ssm",
            optionalConfigurationLocation: cwAgentConfig.name,
            optionalRestart: "yes",
        },
    }, { dependsOn: [installAssociation] }); // Garante que só configure após instalar
};
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * Cria uma aplicação Elastic Beanstalk consumindo um arquivo .zip já existente no S3.
 * Ideal para contas do Cloud Guru devido às restrições de IAM e recursos.
 */
export const createBeanstalkApp = (bucketName: pulumi.Input<string>, s3Key: string) => {
    
    // 1. Definição da "Casca" da Aplicação
    const app = new aws.elasticbeanstalk.Application("acg-app", {
        name: "meu-app-beanstalk",
        description: "App Node.js gerenciada via Pulumi no Cloud Guru",
    });

    // 2. Versão da Aplicação
    // Aponta para o arquivo que você subiu manualmente para o S3
    const appVersion = new aws.elasticbeanstalk.ApplicationVersion("v1", {
        application: app.name,
        bucket: bucketName,
        key: s3Key, 
    });

    // 3. Ambiente (Environment)
    const env = new aws.elasticbeanstalk.Environment("acg-env-v2", {
        application: app.name,
        // IMPORTANTE: Nome do stack precisa ser exato. 
        // Se este falhar, use o comando CLI list-available-solution-stacks
        solutionStackName: "64bit Amazon Linux 2023 v6.7.4 running Node.js 20",
        
        // No Pulumi AWS 6.x+, usa-se 'version' para vincular a versão do código
        version: appVersion.name, 

        settings: [
            // Configura como Instância Única para evitar custos/erros com Load Balancers
            { 
                namespace: "aws:elasticbeanstalk:environment", 
                name: "EnvironmentType", 
                value: "SingleInstance" 
            },
            // t3.micro é geralmente a única permitida em labs básicos
            { 
                namespace: "aws:autoscaling:launchconfiguration", 
                name: "InstanceType", 
                value: "t3.micro" 
            },
            // IamInstanceProfile: O Cloud Guru pré-cria esta role para as instâncias EC2
            { 
                namespace: "aws:autoscaling:launchconfiguration", 
                name: "IamInstanceProfile", 
                value: "aws-elasticbeanstalk-ec2-role" 
            },
            // ServiceRole: Necessária para o Beanstalk gerenciar os recursos na sua conta
            {
                namespace: "aws:elasticbeanstalk:environment",
                name: "ServiceRole",
                value: "aws-elasticbeanstalk-service-role"
            }
        ],
    }, { dependsOn: [appVersion] }); // Garante que a versão exista antes do ambiente tentar usá-la

    return env.endpointUrl;
};
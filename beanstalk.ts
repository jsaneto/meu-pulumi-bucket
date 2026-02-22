import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export const createBeanstalkApp = (bucketName: pulumi.Input<string>, s3Key: string) => {
    
    // 1. Definição da Aplicação
    const app = new aws.elasticbeanstalk.Application("acg-app", {
        name: "meu-app-beanstalk",
    });

    // 2. Versão da Aplicação apontando para o arquivo que você subiu manualmente
    const appVersion = new aws.elasticbeanstalk.ApplicationVersion("v1", {
        application: app.name,
        bucket: bucketName,
        key: s3Key, // Ex: "meu-projeto/app-v1.zip"
    });

    // 3. Ambiente
    const env = new aws.elasticbeanstalk.Environment("acg-env", {
        application: app.name,
        solutionStackName: "64bit Amazon Linux 2023 v6.7.4 running Node.js 20",
        version: appVersion.name,
        settings: [
            { namespace: "aws:elasticbeanstalk:environment", name: "EnvironmentType", value: "SingleInstance" },
            { namespace: "aws:autoscaling:launchconfiguration", name: "InstanceType", value: "t3.micro" },
            { namespace: "aws:autoscaling:launchconfiguration", name: "IamInstanceProfile", value: "aws-elasticbeanstalk-ec2-role" },
        ],
    });

    return env.endpointUrl;
};
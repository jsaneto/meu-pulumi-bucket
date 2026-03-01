// sns.ts
import * as pulumi from "@pulumi/pulumi"; // <--- ADICIONE ESTA LINHA
import * as aws from "@pulumi/aws";

export function createNotificationSystem(queueArn: pulumi.Input<string>) {
    const meuTopico = new aws.sns.Topic("meu-topico-alerta", {});
    
    // Faz o "Fan-out" para a fila SQS que você já tem
    new aws.sns.TopicSubscription("sqs-subscription", {
        topic: meuTopico.arn,
        protocol: "sqs",
        endpoint: queueArn,
    });

    return meuTopico;
}
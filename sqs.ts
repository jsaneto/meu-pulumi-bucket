import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createQueue() {
    // 1. DLQ (Fila de Erros)
    const filaPedidosDlq = new aws.sqs.Queue("fila-pedidos-dlq", {
        messageRetentionSeconds: 1209600,
    });

    // 2. Fila Principal
    const filaPrincipal = new aws.sqs.Queue("fila-pedidos", {
        visibilityTimeoutSeconds: 30,
        redrivePolicy: filaPedidosDlq.arn.apply(arn => JSON.stringify({
            deadLetterTargetArn: arn,
            maxReceiveCount: 3,
        })),
    });

    // 3. POLÍTICA DE ACESSO (O Pulo do Gato)
    // Isso permite que QUALQUER SNS Topic envie mensagens para esta fila.
    // Em produção, você restringiria ao ARN do seu tópico específico.
    new aws.sqs.QueuePolicy("fila-pedidos-policy", {
        queueUrl: filaPrincipal.id,
        policy: filaPrincipal.arn.apply(arn => JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Principal: { Service: "sns.amazonaws.com" },
                Action: "sqs:SendMessage",
                Resource: arn,
            }],
        })),
    });

    return filaPrincipal;
}
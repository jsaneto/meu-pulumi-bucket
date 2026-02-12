import * as aws from "@pulumi/aws";

export function createQueue() {
    return new aws.sqs.Queue("fila-pedidos", {
        visibilityTimeoutSeconds: 30,
        // Dica: No futuro, você pode adicionar uma DLQ aqui
    });
}
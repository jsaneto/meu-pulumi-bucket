import * as aws from "@pulumi/aws";

/**
 * Cria uma fila de mensagens SQS (Simple Queue Service).
 * Esta fila é usada para desacoplar o envio de dados do processamento pesado.
 */
export function createQueue() {
    return new aws.sqs.Queue("fila-pedidos", {
        /**
         * visibilityTimeoutSeconds: 30
         * Define quanto tempo uma mensagem fica "invisível" para outros consumidores
         * após ser lida pela Lambda. 
         * * IMPORTANTE: Este valor deve ser sempre IGUAL ou MAIOR que o timeout 
         * da sua função Lambda (que também configuramos como 30s). 
         * Se a Lambda demorar mais que isso, a mensagem reaparece na fila 
         * e acaba sendo processada em duplicidade.
         */
        visibilityTimeoutSeconds: 30,

        // Dica: No futuro, você pode adicionar uma Dead Letter Queue (DLQ) aqui.
        // Uma DLQ serve para isolar mensagens que falharam muitas vezes no processamento.
    });
}
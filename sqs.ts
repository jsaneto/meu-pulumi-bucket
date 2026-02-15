import * as aws from "@pulumi/aws";

/**
 * Cria uma fila de mensagens SQS com suporte a Dead Letter Queue (DLQ).
 * Mantemos a fila original e adicionamos uma camada de segurança para erros.
 */
export function createQueue() {

    // 1. Criamos a DLQ (Fila de Erros)
    // Ela precisa existir primeiro para que a fila principal saiba para onde enviar os erros.
    const filaPedidosDlq = new aws.sqs.Queue("fila-pedidos-dlq", {
        /**
         * messageRetentionSeconds: 1209600
         * Retemos as mensagens com erro por 14 dias (máximo) para que você 
         * tenha tempo de analisar o que causou a falha sem pressa.
         */
        messageRetentionSeconds: 1209600,
    });

    // 2. Sua fila original, agora com a configuração de DLQ
    return new aws.sqs.Queue("fila-pedidos", {
        /**
         * visibilityTimeoutSeconds: 30
         * Mantido conforme sua regra: igual ou maior que o timeout da Lambda.
         */
        visibilityTimeoutSeconds: 30,

        /**
         * redrivePolicy: Esta é a "ponte" entre a sua fila e a DLQ.
         * Usamos JSON.stringify porque a AWS espera esse parâmetro como uma String JSON.
         */
        redrivePolicy: filaPedidosDlq.arn.apply(arn => JSON.stringify({
            // Onde as mensagens problemáticas serão entregues
            deadLetterTargetArn: arn,
            
            /**
             * maxReceiveCount: 3
             * Define quantas vezes a fila tentará entregar a mensagem para o seu código.
             * Se falhar 3 vezes, a AWS desiste e move a mensagem para a DLQ automaticamente.
             */
            maxReceiveCount: 3,
        })),
    });
}
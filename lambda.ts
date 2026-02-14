import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
// 1. Importações modulares do SDK v3 (Reduz o tamanho do pacote da Lambda)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

/**
 * Cria a função Lambda Worker e todas as permissões necessárias para processar SQS e gravar no DynamoDB.
 * param tabela Referência da tabela DynamoDB onde os dados serão salvos.
 * param fila Referência da fila SQS que disparará a função.
 */
export function createWorker(
    tabela: aws.dynamodb.Table,
    fila: aws.sqs.Queue
) {
    // --- SEGURANÇA (IAM) ---

    // Cria a Role (Papel) que a Lambda assumirá para agir em seu nome
    const role = new aws.iam.Role("worker-role", {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "lambda.amazonaws.com",
        }),
    });

    // Permite que a Lambda escreva logs no CloudWatch (Essencial para Debug)
    new aws.iam.RolePolicyAttachment("worker-basic-exec", {
        role: role.name,
        policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
    });

    // Permissão de "Menor Privilégio": A Lambda só pode ler desta fila específica
    new aws.iam.RolePolicy("worker-sqs-policy", {
        role: role.id,
        policy: fila.arn.apply(arn =>
            JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: [
                        "sqs:ReceiveMessage",
                        "sqs:DeleteMessage",
                        "sqs:GetQueueAttributes",
                        "sqs:ChangeMessageVisibility",
                    ],
                    Resource: arn,
                }],
            })
        ),
    });

    // Permissão de "Menor Privilégio": A Lambda só pode escrever nesta tabela específica
    new aws.iam.RolePolicy("worker-ddb-policy", {
        role: role.id,
        policy: tabela.arn.apply(arn =>
            JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: ["dynamodb:PutItem"],
                    Resource: arn,
                }],
            })
        ),
    });

    // --- EXECUÇÃO (LAMBDA) ---

    const workerLambda = new aws.lambda.CallbackFunction("worker-fn", {
        role: role.arn,
        timeout: 30, // Tempo máximo de execução de 30 segundos
        runtime: "nodejs20.x", // Runtime moderna com suporte nativo a ESM e SDK v3

        /**
         * callbackFactory: Técnica de otimização de Cold Start.
         * O código dentro da factory roda apenas uma vez quando a Lambda "acorda".
         * O código retornado (async event) roda a cada nova mensagem.
         */
        callbackFactory: () => {
            // Inicializa os clientes fora do handler para reutilizar conexões TCP
            const client = new DynamoDBClient({});
            const ddb = DynamoDBDocumentClient.from(client);
            const tableName = process.env.TABLE_NAME;

            return async (event: aws.sqs.QueueEvent) => {
                // Itera sobre o lote (batch) de mensagens recebidas
                for (const record of event.Records) {
                    // Processa e grava no DynamoDB usando o padrão de Comandos do SDK v3
                    await ddb.send(new PutCommand({
                        TableName: tableName,
                        Item: {
                            id: record.messageId, // Chave primária
                            data: JSON.parse(record.body), // O conteúdo da mensagem SQS
                            createdAt: new Date().toISOString(), // Timestamp de processamento
                        },
                    }));
                }
            };
        },
        environment: {
            variables: {
                TABLE_NAME: tabela.name, // Injeta o nome da tabela dinamicamente
            },
        },
    });

    // --- GATILHO (TRIGGER) ---

    // Conecta a Fila SQS à Lambda, definindo quantos registros processar por vez
    new aws.lambda.EventSourceMapping("sqs-trigger", {
        eventSourceArn: fila.arn,
        functionName: workerLambda.name,
        batchSize: 5, // Processa até 5 mensagens em uma única execução da Lambda (Economia de $)
    });

    return workerLambda;
}
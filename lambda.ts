import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createWorker(
    tabela: aws.dynamodb.Table,
    fila: aws.sqs.Queue
) {
    // 🔐 Role customizada (melhor prática do que usar policies genéricas)
    const role = new aws.iam.Role("worker-role", {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "lambda.amazonaws.com",
        }),
    });

    // 📜 Permissão básica de logs
    new aws.iam.RolePolicyAttachment("worker-basic-exec", {
        role: role.name,
        policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
    });

    // 📜 Permissão mínima para consumir a fila específica
    new aws.iam.RolePolicy("worker-sqs-policy", {
        role: role.id,
        policy: fila.arn.apply(arn =>
            JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Action: [
                            "sqs:ReceiveMessage",
                            "sqs:DeleteMessage",
                            "sqs:GetQueueAttributes",
                            "sqs:ChangeMessageVisibility",
                        ],
                        Resource: arn,
                    },
                ],
            })
        ),
    });

    // 📜 Permissão mínima para escrever na tabela específica
    new aws.iam.RolePolicy("worker-ddb-policy", {
        role: role.id,
        policy: tabela.arn.apply(arn =>
            JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Action: [
                            "dynamodb:PutItem",
                        ],
                        Resource: arn,
                    },
                ],
            })
        ),
    });

    // 🚀 Lambda
    const workerLambda = new aws.lambda.CallbackFunction("worker-fn", {
        role: role.arn,
        timeout: 30,
        callback: async (event: aws.sqs.QueueEvent) => {
            const AWS = require("aws-sdk");
            const ddb = new AWS.DynamoDB.DocumentClient();

            for (const record of event.Records) {
                await ddb.put({
                    TableName: process.env.TABLE_NAME,
                    Item: {
                        id: record.messageId,
                        data: JSON.parse(record.body),
                        createdAt: new Date().toISOString(),
                    },
                }).promise();
            }
        },
        environment: {
            variables: {
                TABLE_NAME: tabela.name,
            },
        },
    });

    // 🔗 Conecta SQS → Lambda
    new aws.lambda.EventSourceMapping("sqs-trigger", {
        eventSourceArn: fila.arn,
        functionName: workerLambda.name,
        batchSize: 5,
    });

    return workerLambda;
}

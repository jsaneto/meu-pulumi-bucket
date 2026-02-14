import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
// 1. Importações do SDK v3
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

export function createWorker(
    tabela: aws.dynamodb.Table,
    fila: aws.sqs.Queue
) {
    const role = new aws.iam.Role("worker-role", {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "lambda.amazonaws.com",
        }),
    });

    new aws.iam.RolePolicyAttachment("worker-basic-exec", {
        role: role.name,
        policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
    });

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

    // 🚀 Lambda Refatorada
    const workerLambda = new aws.lambda.CallbackFunction("worker-fn", {
        role: role.arn,
        timeout: 30,
        runtime: "nodejs20.x", // Usando versão moderna
        // callbackFactory garante que o cliente seja criado apenas 1 vez (Cold Start)
        callbackFactory: () => {
            const client = new DynamoDBClient({});
            const ddb = DynamoDBDocumentClient.from(client);
            const tableName = process.env.TABLE_NAME;

            return async (event: aws.sqs.QueueEvent) => {
                for (const record of event.Records) {
                    // Usando o comando PutCommand do SDK v3
                    await ddb.send(new PutCommand({
                        TableName: tableName,
                        Item: {
                            id: record.messageId,
                            data: JSON.parse(record.body),
                            createdAt: new Date().toISOString(),
                        },
                    }));
                }
            };
        },
        environment: {
            variables: {
                TABLE_NAME: tabela.name,
            },
        },
    });

    new aws.lambda.EventSourceMapping("sqs-trigger", {
        eventSourceArn: fila.arn,
        functionName: workerLambda.name,
        batchSize: 5,
    });

    return workerLambda;
}
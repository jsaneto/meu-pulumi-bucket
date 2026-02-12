import * as aws from "@pulumi/aws";

export function createWorker(tabela: aws.dynamodb.Table, fila: aws.sqs.Queue) {
    const workerLambda = new aws.lambda.CallbackFunction("worker-fn", {
        policies: [
            aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
            aws.iam.ManagedPolicy.AmazonSQSReadOnlyAccess,
            aws.iam.ManagedPolicy.AmazonDynamoDBFullAccess,
        ],
        callback: async (event: aws.sqs.QueueEvent) => {
            const AWS = require("aws-sdk");
            const ddb = new AWS.DynamoDB.DocumentClient();
            
            for (const record of event.Records) {
                await ddb.put({
                    TableName: tabela.name.get(),
                    Item: {
                        id: record.messageId,
                        data: JSON.parse(record.body),
                        createdAt: new Date().toISOString(),
                    },
                }).promise();
            }
        },
    });

    // Cria o gatilho que conecta os dois
    new aws.lambda.EventSourceMapping("sqs-trigger", {
        eventSourceArn: fila.arn,
        functionName: workerLambda.name,
        batchSize: 5,
    });

    return workerLambda;
}
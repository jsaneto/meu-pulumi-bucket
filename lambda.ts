import * as aws from "@pulumi/aws";

export function createWorker(tabela: aws.dynamodb.Table, fila: aws.sqs.Queue) {
    
    // 1. Criar a Role manualmente (dá mais controle que o CallbackFunction sozinho)
    const role = new aws.iam.Role("worker-role", {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
    });

    // 2. Anexar a permissão de SQS à Role
    const policyAttachment = new aws.iam.RolePolicyAttachment("worker-sqs-policy", {
        role: role,
        policyArn: aws.iam.ManagedPolicy.AmazonSQSReadOnlyAccess,
    });
    
    // Anexar também Dynamo e Logs...
    new aws.iam.RolePolicyAttachment("worker-dynamo-policy", {
        role: role,
        policyArn: aws.iam.ManagedPolicy.AmazonDynamoDBFullAccess,
    });

    // 3. Criar a Lambda usando a Role que criamos
    const workerLambda = new aws.lambda.CallbackFunction("worker-fn", {
        role: role, // Forçamos o uso da role manual
        callback: async (event: aws.sqs.QueueEvent) => {
            // Seu código de processamento aqui...
        },
    });

    // 4. O PULO DO GATO: O Mapping deve depender do ATTACHMENT da policy, não só da Lambda
    new aws.lambda.EventSourceMapping("sqs-trigger", {
        eventSourceArn: fila.arn,
        functionName: workerLambda.name,
        batchSize: 5,
    }, { dependsOn: [policyAttachment, workerLambda] }); // <--- AGUARDA O VÍNCULO DA PERMISSÃO

    return workerLambda;
}
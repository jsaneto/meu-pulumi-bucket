import * as aws from "@pulumi/aws";

/**
 * Cria um Amazon Kinesis Data Stream para processamento de eventos em tempo real.
 */
export const createKinesisStream = (streamName: string) => {
    const stream = new aws.kinesis.Stream(streamName, {
        shardCount: 1, // 1 Shard é mais que suficiente para testes no ACG
        retentionPeriod: 24, // Mantém os dados por 24 horas
        shardLevelMetrics: [
            "IncomingBytes",
            "OutgoingBytes",
        ],
        streamModeDetails: {
            streamMode: "PROVISIONED", // No ACG, provisioned com 1 shard é mais seguro para limites
        },
        tags: {
            Environment: "Sandbox-ACG",
        },
    });

    return stream;
};
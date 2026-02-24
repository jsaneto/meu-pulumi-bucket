import * as aws from "@pulumi/aws";

export function createFirehoseInfrastructure(name: string) {
    // 1. Usando s3.Bucket (o substituto recomendado para o BucketV2)
    const bucket = new aws.s3.Bucket(`${name}-bucket`, {
        forceDestroy: true, // Garante que o bucket seja apagado mesmo com arquivos dentro
    });

    // 2. Role de IAM para o Firehose
    const firehoseRole = new aws.iam.Role(`${name}-role`, {
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: { Service: "firehose.amazonaws.com" },
            }],
        }),
    });

    // 3. Política de permissão (S3 Access)
    const firehoseS3Policy = new aws.iam.RolePolicy(`${name}-s3-policy`, {
        role: firehoseRole.id,
        policy: bucket.arn.apply(arn => JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Action: [
                    "s3:AbortMultipartUpload",
                    "s3:GetBucketLocation",
                    "s3:GetObject",
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:PutObject"
                ],
                Resource: [arn, `${arn}/*`],
            }],
        })),
    });

    // 4. Kinesis Firehose Delivery Stream
    const firehose = new aws.kinesis.FirehoseDeliveryStream(`${name}-stream`, {
        destination: "extended_s3",
        extendedS3Configuration: {
            roleArn: firehoseRole.arn,
            bucketArn: bucket.arn,
            compressionFormat: "GZIP", 
            bufferingInterval: 60,
            bufferingSize: 5,
        },
    }, { dependsOn: [firehoseS3Policy] }); // Boa prática: garante que a política exista antes do stream

    return {
        firehoseArn: firehose.arn,
        bucketName: bucket.id,
    };
}
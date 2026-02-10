import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Bucket original (estático, sem alterações)
export const createS3Bucket = () => {
    const bucket = new aws.s3.Bucket("meu-bucket-separado", {
        tags: { Name: "Bucket de Produção" },
    });
    new aws.s3.BucketVersioning("v2-versioning", {
        bucket: bucket.id,
        versioningConfiguration: { status: "Enabled" },
    });
    return bucket;
};

// Função para criar o novo bucket
export const createStaticContentBucket = () => {
    return new aws.s3.Bucket("bucket-static-cloudfront", {
        forceDestroy: true,
        tags: { Name: "Bucket Conteúdo CDN" },
    });
};

// FUNÇÃO NOVA: Define a política no S3.ts
export const attachBucketPolicy = (bucket: aws.s3.Bucket, cdnArn: pulumi.Output<string>) => {
    new aws.s3.BucketPolicy("static-bucket-policy", {
        bucket: bucket.id,
        policy: pulumi.all([bucket.arn, cdnArn]).apply(([bucketArn, arn]) => JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Sid: "AllowCloudFrontServicePrincipal",
                Effect: "Allow",
                Principal: { Service: "cloudfront.amazonaws.com" },
                Action: "s3:GetObject",
                Resource: `${bucketArn}/*`,
                Condition: {
                    StringEquals: { "AWS:SourceArn": arn }
                }
            }]
        })),
    });
};
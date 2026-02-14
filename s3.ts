import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * Cria um Bucket S3 configurado para armazenamento de arquivos de produção.
 * Foco: Persistência de dados e segurança contra deleção acidental via Versionamento.
 */
export const createS3Bucket = () => {
    // Instancia o recurso de Bucket S3
    const bucket = new aws.s3.Bucket("meu-bucket-separado", {
        tags: { Name: "Bucket de Produção" },
    });

    // Ativa o versionamento para permitir recuperar arquivos deletados ou alterados
    new aws.s3.BucketVersioning("v2-versioning", {
        bucket: bucket.id, // Referencia o ID do bucket criado acima
        versioningConfiguration: { status: "Enabled" },
    });

    return bucket;
};

/**
 * Cria um Bucket S3 otimizado para servir conteúdo estático via CloudFront.
 */
export const createStaticContentBucket = () => {
    return new aws.s3.Bucket("bucket-static-cloudfront", {
        // Permite que o Pulumi delete o bucket mesmo que ele contenha arquivos (útil para testes)
        forceDestroy: true, 
        tags: { Name: "Bucket Conteúdo CDN" },
    });
};

/**
 * Vincula uma política de acesso ao Bucket para que apenas o CloudFront consiga ler os arquivos.
 * * param bucket - O bucket alvo da política
 * param cdnArn - O ARN da Distribuição CloudFront (envolvido em Output para lidar com promessas)
 */
export const attachBucketPolicy = (bucket: aws.s3.Bucket, cdnArn: pulumi.Output<string>) => {
    new aws.s3.BucketPolicy("static-bucket-policy", {
        bucket: bucket.id, // Associa esta política ao bucket específico
        // pulumi.all aguarda a resolução do ARN do bucket e da CDN antes de gerar o JSON
        policy: pulumi.all([bucket.arn, cdnArn]).apply(([bucketArn, arn]) => JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Sid: "AllowCloudFrontServicePrincipal",
                Effect: "Allow",
                Principal: { 
                    Service: "cloudfront.amazonaws.com" // Define que o serviço CloudFront é o "usuário"
                },
                Action: "s3:GetObject", // Permite apenas a leitura de objetos
                Resource: `${bucketArn}/*`, // Aplica a regra a todos os arquivos dentro do bucket
                Condition: {
                    // Trava de segurança: só permite acesso se a requisição vier da CDN específica (ARN)
                    StringEquals: { "AWS:SourceArn": arn }
                }
            }]
        })),
    });
};
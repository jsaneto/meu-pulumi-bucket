import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as network from "./network";
import * as autoscaling from "./autoscaling";
import { createS3Bucket, createStaticContentBucket, attachBucketPolicy } from "./s3";
import { createCloudFront } from "./cloudfront";
import { createContainerService } from "./container";
import { createDatabase } from "./dynamo";
import { createApiGateway } from "./apigateway";
// --- 1. INFRAESTRUTURA DE REDE ---
const meuSG = network.createSecurityGroup();

// --- 2. COMPUTAÇÃO (EC2 GRAVITON + SPOT + ASG) ---
const asgResources = autoscaling.createAutoScalingGroup(meuSG.id);

// --- 3. ARMAZENAMENTO (S3) ---
// Bucket Privado (Versionado)
const bucketPrivado = createS3Bucket();

// Novo Bucket para o CloudFront (Conteúdo Estático)
const novoBucket = createStaticContentBucket();

// --- 4. ENTREGA (CLOUDFRONT) ---
const minhaCDN = createCloudFront(novoBucket);

// Conecta a segurança entre S3 e CloudFront
attachBucketPolicy(novoBucket, minhaCDN.arn);

// --- 5. CONTEÚDO (ARQUIVO DE TESTE CORRIGIDO) ---

// Extraímos os outputs específicos para garantir que o interpolate foque neles
const lbDns = asgResources.lbDns;
const cdnDomain = minhaCDN.domainName;

const indexHtml = new aws.s3.BucketObjectv2("index-html", {
    bucket: novoBucket.id,
    key: "index.html",
    // Agora o interpolate lida com referências diretas de Output<string>
    content: pulumi.interpolate`
        <html>
            <head><meta charset="UTF-8"></head>
            <body>
                <h1>🚀 Deploy via Pulumi Completo!</h1>
                <p><b>Load Balancer (EC2 Graviton):</b> <a href="http://${lbDns}">${lbDns}</a></p>
                <p><b>CloudFront (S3 Static):</b> <a href="https://${cdnDomain}/index.html">${cdnDomain}/index.html</a></p>
                <hr>
                <p>Status do aprendizado: Agora eu REALMENTE entendo Outputs!</p>
            </body>
        </html>
    `,
    contentType: "text/html",
});

const urlContainer = createContainerService();
const minhaTabela = createDatabase();

const stage = createApiGateway();

// --- EXPORTS (O que aparecerá no seu terminal) ---
export const loadBalancerUrl = asgResources.lbDns;
export const cloudFrontUrl = pulumi.interpolate`https://${minhaCDN.domainName}/index.html`;
export const bucketProducaoName = bucketPrivado.id;
export const bucketCdnName = novoBucket.id;
export const containerUrl = pulumi.interpolate`http://${urlContainer}`;
export const tableName = minhaTabela.name;
export const tableArn = minhaTabela.arn;
export const endpoint = pulumi.interpolate`${stage.invokeUrl}/status`;
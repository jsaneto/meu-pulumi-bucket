import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as network from "./network";
import * as autoscaling from "./autoscaling";
import { createS3Bucket, createStaticContentBucket, attachBucketPolicy } from "./s3";
import { createCloudFront } from "./cloudfront";
import { createContainerService } from "./container";
import { createDatabase } from "./dynamo";
import { createApiGateway } from "./apigateway";
import * as sqs from "./sqs";
import * as worker from "./lambda";
import { createEC2Instance } from "./ec2";
import { createEBSVolumes } from "./ebs";
import { createSharedFileSystem } from "./efs";
import { createK8sCluster } from "./eks";
import { createRDSInstance } from "./rds";
import { createAuroraServerless } from "./aurora_serverless";
import { createBeanstalkApp } from "./beanstalk";
import { createRedisCluster } from "./redis";
import { createKinesisStream } from "./kinesis";
import { createFirehoseInfrastructure } from "./firehose";
import { createAthenaInfrastructure } from "./athena";
import { createGlueInfrastructure } from "./glue";
import { createVpc } from "./vpc";
import { createSubnets } from "./subnets";
import { createInternetConnectivity } from "./igw";
import { createVpcPeering } from "./peering"; // Importe o novo arquivo
import { createVpcEndpoints } from "./vpc_endpoint";
import { createNotificationSystem } from "./sns";
import { createDatabaseSecret, enableRotation } from "./secret";
import { createObservabilityStack } from "./observability";
import { createWaf } from "./waf";
import { createPrivateDns } from "./route53";
// --- 1. INFRAESTRUTURA DE REDE ---
const vpc = createVpc();
const defaultVpc = aws.ec2.getVpcOutput({ default: true });

// Agora criamos os Security Groups passando os IDs necessários
// Criamos um para a sua VPC nova e um para a Default (conforme solicitado)
const sgCustom = network.createSecurityGroup(vpc.id, "custom-vpc");
const sgDefault = network.createSecurityGroup(defaultVpc.id, "default-vpc");

const meuSG = sgCustom;
// Cria o firewall (Security Group) que será usado pelas instâncias EC2.
//const meuSG = network.createSecurityGroup();
const networks = createSubnets({
    vpcId: vpc.id,
    azs: ["us-east-1a", "us-east-1b"] // Passamos a lista aqui
});

const { dbSecret, dbPassword } = createDatabaseSecret();

// --- 2. COMPUTAÇÃO (EC2 GRAVITON + SPOT + ASG) ---
// Cria o cluster de servidores que escalam sozinhos e economizam custo com instâncias Spot.
const asgResources = autoscaling.createAutoScalingGroup(
    meuSG.id,
    vpc.id,                                     // ID da sua VPC custom
    pulumi.all(networks.publicSubnets.map(s => s.id))       // Subnets da sua VPC custom
);
const dnsPrivado = createPrivateDns(
    vpc.id, 
    asgResources.lbDns, 
    asgResources.lbZoneId // Certifique-se que o módulo autoscaling retorna isso!
);
const minhaInstancia = createEC2Instance(
    meuSG.id, 
    networks.publicSubnets[0].id // <--- Passando a primeira subnet pública da sua VPC
);
// --- 3. ARMAZENAMENTO (S3) ---
// Cria um bucket para arquivos de produção (com versionamento).
const bucketPrivado = createS3Bucket();

// Cria um bucket dedicado para hospedar o site estático que será servido pela CDN.
const novoBucket = createStaticContentBucket();

// --- 4. ENTREGA (CLOUDFRONT) ---
// Configura a rede de entrega global (CDN) apontando para o bucket estático.
const minhaCDN = createCloudFront(novoBucket);

// Aplica a política de segurança que permite que apenas a CDN leia os arquivos do Bucket.
attachBucketPolicy(novoBucket, minhaCDN.arn);

// --- 5. CONTEÚDO (UPLOAD DO FRONTEND) ---

// Capturamos os DNS gerados para injetar dinamicamente no HTML.
const lbDns = asgResources.lbDns;
const cdnDomain = minhaCDN.domainName;

// Cria o arquivo index.html dentro do bucket S3 automaticamente.
const indexHtml = new aws.s3.BucketObjectv2("index-html", {
    bucket: novoBucket.id,
    key: "index.html",
    // O 'pulumi.interpolate' resolve as URLs finais da AWS antes de escrever o arquivo.
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

// --- 6. SERVIÇOS ADICIONAIS E BACKEND ---

// Sobe o serviço de containers (Nginx) no ECS Fargate.
const urlContainer = createContainerService();

// Cria o banco de dados NoSQL DynamoDB.
const minhaTabela = createDatabase();

// Cria o API Gateway com o endpoint de resposta Mock.
const stage = createApiGateway();

// Cria a fila de mensagens SQS.
const minhaFila = sqs.createQueue();

const meuTopicoSns = createNotificationSystem(minhaFila.arn);

// Cria a função Lambda (Worker) que conecta a Fila ao Banco de Dados usando SDK v3.
worker.createWorker(minhaTabela, minhaFila);

const volumes = createEBSVolumes("us-east-1a");

const efsResources = createSharedFileSystem();

//const meuEKS = createK8sCluster();

const myDatabase = createRDSInstance(
    "my-acg-rds", 
    meuSG.id, 
    networks.privateSubnets.map(s => s.id),
    dbPassword.result 
);

//const rotation = enableRotation(dbSecret.id);

//const beanstalkUrl = createBeanstalkApp(bucketPrivado.id, "app-v1.zip");

//const redis = createRedisCluster(meuSG.id);

const analyticsStream = createKinesisStream("telemetria-app-stream");

const infra = createFirehoseInfrastructure("meu-projeto-guru");

// 2. Cria o Athena usando o Bucket gerado pelo Firehose
const athenaInfra = createAthenaInfrastructure("meu-projeto-guru", infra.bucketName);

const glueInfra = createGlueInfrastructure("meu-projeto-guru", infra.bucketName);

const connectivity = createInternetConnectivity({
    vpcId: vpc.id,
    publicSubnetIds: networks.publicSubnets.map(s => s.id),
    privateSubnetIds: networks.privateSubnets.map(s => s.id)
});

const peering = createVpcPeering({
    customVpcId: vpc.id,
    customVpcCidr: "10.0.0.0/16", // O CIDR que você definiu no vpc.ts
    customRouteTableIds: [
        connectivity.publicRouteTableId, 
        connectivity.privateRouteTableId
    ],
});

const endpoints = createVpcEndpoints({
    vpcId: vpc.id,
    region: "us-east-1", 
    // Injeta a rota do S3 tanto na pública quanto na privada 2
    routeTableIds: [connectivity.publicRouteTableId, connectivity.privateRouteTableId],
    // Para Interface Endpoints, usamos as subnets privadas
    subnetIds: networks.privateSubnets.map(s => s.id),
    securityGroupId: meuSG.id, // O SG deve permitir tráfego na porta 443
});

createObservabilityStack({
    dbInstanceId: myDatabase.id,
    sqsQueueName: minhaFila.name,
    snsTopicArn: meuTopicoSns.arn,
    asgName: asgResources.asg.name, // Certifique-se que o módulo ASG retorna 'asgName'
});

const meuWaf = createWaf(asgResources.lbArn);

//const myAurora = createAuroraServerless("lab-serverless", meuSG.id);

// --- EXPORTS (O que aparecerá no seu terminal após o 'pulumi up') ok ---
// Essas variáveis facilitam o acesso rápido aos recursos criados sem entrar no console AWS.
export const loadBalancerUrl = asgResources.lbDns;
export const cloudFrontUrl = pulumi.interpolate`https://${minhaCDN.domainName}/index.html`;
export const bucketProducaoName = bucketPrivado.id;
export const bucketCdnName = novoBucket.id;
export const containerUrl = pulumi.interpolate`http://${urlContainer}`;
export const tableName = minhaTabela.name;
export const tableArn = minhaTabela.arn;
export const endpoint = pulumi.interpolate`${stage.invokeUrl}/status`;
export const dbEndpoint = myDatabase.endpoint;
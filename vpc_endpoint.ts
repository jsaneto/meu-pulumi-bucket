import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

interface EndpointArgs {
    vpcId: pulumi.Input<string>;
    region: string;
    routeTableIds: pulumi.Input<string>[]; // Para Gateway Endpoints (S3/Dynamo)
    subnetIds: pulumi.Input<string>[];     // Para Interface Endpoints
    securityGroupId: pulumi.Input<string>; // Para Interface Endpoints (Porta 443)
}

export function createVpcEndpoints(args: EndpointArgs) {
    const region = args.region;

    // --- 1. GATEWAY ENDPOINTS (Gratuitos e baseados em rotas) ---
    
    // S3: Essencial para buckets e scripts de inicialização
    const s3Endpoint = new aws.ec2.VpcEndpoint("s3-gw-endpoint", {
        vpcId: args.vpcId,
        serviceName: `com.amazonaws.${region}.s3`,
        vpcEndpointType: "Gateway",
        routeTableIds: args.routeTableIds,
    });

    // DynamoDB: Ótimo para apps serverless sem sair da rede interna
    const dynamoEndpoint = new aws.ec2.VpcEndpoint("dynamo-gw-endpoint", {
        vpcId: args.vpcId,
        serviceName: `com.amazonaws.${region}.dynamodb`,
        vpcEndpointType: "Gateway",
        routeTableIds: args.routeTableIds,
    });

    // --- 2. INTERFACE ENDPOINTS (Privatelink - Custo por hora) ---
    
    // Lista de serviços vitais:
    // ssm/ssmmessages: Para acesso via Session Manager (sem SSH exposto)
    // logs: Para enviar logs do CloudWatch
    // ecr.api/ecr.dkr: Necessários se for rodar Docker/ECS em subnets privadas
    const interfaceServices = [
        "ssm",
        "ssmmessages",
        "ec2messages",
        "logs",
        "ecr.api",
        "ecr.dkr",
        "secretsmanager"
    ];

    const interfaceEndpoints: { [key: string]: aws.ec2.VpcEndpoint } = {};

    interfaceServices.forEach((service) => {
        interfaceEndpoints[service] = new aws.ec2.VpcEndpoint(`${service}-endpoint`, {
            vpcId: args.vpcId,
            serviceName: `com.amazonaws.${region}.${service}`,
            vpcEndpointType: "Interface",
            subnetIds: args.subnetIds,
            securityGroupIds: [args.securityGroupId],
            privateDnsEnabled: true,
        });
    });

    return {
        s3EndpointId: s3Endpoint.id,
        dynamoEndpointId: dynamoEndpoint.id,
        // Retorna um mapa com todos os interface endpoints criados
        interfaceEndpoints: interfaceEndpoints,
    };
}
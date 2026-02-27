import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

interface EndpointArgs {
    vpcId: pulumi.Input<string>;
    region: string;
    routeTableIds: pulumi.Input<string>[]; // Para o Gateway Endpoint (S3)
    subnetIds: pulumi.Input<string>[];     // Para Interface Endpoints
    securityGroupId: pulumi.Input<string>; // Para Interface Endpoints
}

export function createVpcEndpoints(args: EndpointArgs) {
    // 1. S3 Gateway Endpoint (Melhor custo-benefício, pois é gratuito)
    const s3Endpoint = new aws.ec2.VpcEndpoint("s3-gw-endpoint", {
        vpcId: args.vpcId,
        serviceName: `com.amazonaws.${args.region}.s3`,
        vpcEndpointType: "Gateway",
        routeTableIds: args.routeTableIds, // Adiciona a rota automaticamente nas RTs
    });

    // 2. Interface Endpoint para o Secrets Manager (Exemplo de Interface)
    // Isso cria uma ENI (Interface de Rede) dentro das suas subnets
    const secretsManagerEndpoint = new aws.ec2.VpcEndpoint("secrets-endpoint", {
        vpcId: args.vpcId,
        serviceName: `com.amazonaws.${args.region}.secretsmanager`,
        vpcEndpointType: "Interface",
        subnetIds: args.subnetIds,
        securityGroupIds: [args.securityGroupId],
        privateDnsEnabled: true,
    });

    return {
        s3EndpointId: s3Endpoint.id,
        secretsEndpointId: secretsManagerEndpoint.id,
    };
}
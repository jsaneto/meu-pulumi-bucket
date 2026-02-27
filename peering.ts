import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

interface PeeringArgs {
    customVpcId: pulumi.Input<string>;
    customVpcCidr: string; // Ex: "10.0.0.0/16"
    customRouteTableIds: pulumi.Input<string>[]; // IDs das RTs Pública e Privada
}

export async function createVpcPeering(args: PeeringArgs) {
    // 1. Localiza a VPC Default e sua Tabela de Rotas principal
    const defaultVpc = await aws.ec2.getVpc({ default: true });
    const defaultRouteTable = await aws.ec2.getRouteTable({ vpcId: defaultVpc.id });

    // 2. Cria a Conexão de Peering
    const peering = new aws.ec2.VpcPeeringConnection("custom-default-peering", {
        vpcId: args.customVpcId,      // Requester
        peerVpcId: defaultVpc.id,     // Accepter
        autoAccept: true,
        tags: { Name: "peering-to-default" },
    });

    // 3. Habilita resolução de DNS entre as VPCs (Opcional, mas recomendado)
    const peeringOptions = new aws.ec2.PeeringConnectionOptions("peering-dns-options", {
        vpcPeeringConnectionId: peering.id,
        accepter: { allowRemoteVpcDnsResolution: true },
        requester: { allowRemoteVpcDnsResolution: true },
    });

    // 4. Cria as Rotas na sua VPC Customizada (Saindo para a Default)
    // Fazemos um loop para aplicar em todas as tabelas de rotas passadas (Pública e Privada)
    args.customRouteTableIds.forEach((rtId, index) => {
        new aws.ec2.Route(`route-to-default-${index}`, {
            routeTableId: rtId,
            destinationCidrBlock: defaultVpc.cidrBlock,
            vpcPeeringConnectionId: peering.id,
        });
    });

    // 5. Cria a Rota de Retorno na VPC Default (Saindo para a Customizada)
    new aws.ec2.Route("route-back-to-custom", {
        routeTableId: defaultRouteTable.id,
        destinationCidrBlock: args.customVpcCidr,
        vpcPeeringConnectionId: peering.id,
    });

    return {
        peeringConnectionId: peering.id,
        defaultVpcCidr: defaultVpc.cidrBlock
    };
}
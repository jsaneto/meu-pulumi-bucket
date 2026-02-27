import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

interface NetworkArgs {
    vpcId: pulumi.Input<string>;
    publicSubnetIds: pulumi.Input<string>[];
    privateSubnetIds: pulumi.Input<string>[];
}

export function createInternetConnectivity(args: NetworkArgs) {
    const igw = new aws.ec2.InternetGateway("main-igw", {
        vpcId: args.vpcId,
        tags: { Name: "pulumi-igw" },
    });

    const eip = new aws.ec2.Eip("nat-eip", {
        domain: "vpc",
        tags: { Name: "pulumi-nat-eip" },
    });

    const natGw = new aws.ec2.NatGateway("main-nat-gw", {
        subnetId: args.publicSubnetIds[0], 
        allocationId: eip.id,
        tags: { Name: "pulumi-nat-gw" },
    }, { dependsOn: [igw] });

    const publicRouteTable = new aws.ec2.RouteTable("public-rt", {
        vpcId: args.vpcId,
        routes: [{ cidrBlock: "0.0.0.0/0", gatewayId: igw.id }],
        tags: { Name: "pulumi-public-rt" },
    });

    const privateRouteTable = new aws.ec2.RouteTable("private-rt", {
        vpcId: args.vpcId,
        routes: [{ cidrBlock: "0.0.0.0/0", natGatewayId: natGw.id }],
        tags: { Name: "pulumi-private-rt" },
    });

    // Associações (Mantidas conforme seu original)
    args.publicSubnetIds.forEach((id, i) => {
        new aws.ec2.RouteTableAssociation(`pub-assoc-${i}`, {
            subnetId: id,
            routeTableId: publicRouteTable.id,
        });
    });

    args.privateSubnetIds.forEach((id, i) => {
        new aws.ec2.RouteTableAssociation(`priv-assoc-${i}`, {
            subnetId: id,
            routeTableId: privateRouteTable.id,
        });
    });

    // MUDANÇA AQUI: Retornar os IDs das tabelas de rotas
    return { 
        igw, 
        natGw, 
        publicRouteTableId: publicRouteTable.id, 
        privateRouteTableId: privateRouteTable.id 
    };
}
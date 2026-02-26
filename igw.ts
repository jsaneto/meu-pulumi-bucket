import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

interface NetworkArgs {
    vpcId: pulumi.Input<string>;
    publicSubnetIds: pulumi.Input<string>[];
    privateSubnetIds: pulumi.Input<string>[]; // Adicionamos as privadas aqui
}

export function createInternetConnectivity(args: NetworkArgs) {
    // 1. Internet Gateway (já criado anteriormente)
    const igw = new aws.ec2.InternetGateway("main-igw", {
        vpcId: args.vpcId,
        tags: { Name: "pulumi-igw" },
    });

    // 2. Elastic IP para o NAT Gateway
    const eip = new aws.ec2.Eip("nat-eip", {
        domain: "vpc",
        tags: { Name: "pulumi-nat-eip" },
    });

    // 3. NAT Gateway (colocado na PRIMEIRA subnet pública da lista)
    const natGw = new aws.ec2.NatGateway("main-nat-gw", {
        subnetId: args.publicSubnetIds[0], 
        allocationId: eip.id,
        tags: { Name: "pulumi-nat-gw" },
    }, { dependsOn: [igw] }); // Garante que o IGW exista antes

    // 4. Route Table para Subnets PÚBLICAS (via IGW)
    const publicRouteTable = new aws.ec2.RouteTable("public-rt", {
        vpcId: args.vpcId,
        routes: [{ cidrBlock: "0.0.0.0/0", gatewayId: igw.id }],
        tags: { Name: "pulumi-public-rt" },
    });

    // 5. Route Table para Subnets PRIVADAS (via NAT Gateway)
    const privateRouteTable = new aws.ec2.RouteTable("private-rt", {
        vpcId: args.vpcId,
        routes: [{ cidrBlock: "0.0.0.0/0", natGatewayId: natGw.id }],
        tags: { Name: "pulumi-private-rt" },
    });

    // 6. Associações
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

    return { igw, natGw };
}
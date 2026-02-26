import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

interface NetworkArgs {
    vpcId: pulumi.Input<string>;
    publicSubnetIds: pulumi.Input<string>[];
}

export function createInternetConnectivity(args: NetworkArgs) {
    // 1. Criar o Internet Gateway
    const igw = new aws.ec2.InternetGateway("main-igw", {
        vpcId: args.vpcId,
        tags: { Name: "pulumi-igw" },
    });

    // 2. Criar a Route Table para as subnets públicas
    const publicRouteTable = new aws.ec2.RouteTable("public-rt", {
        vpcId: args.vpcId,
        routes: [
            {
                cidrBlock: "0.0.0.0/0", // Todo tráfego de saída...
                gatewayId: igw.id,      // ...vai para o Internet Gateway
            },
        ],
        tags: { Name: "pulumi-public-rt" },
    });

    // 3. Associar a Route Table com cada Subnet Pública
    args.publicSubnetIds.forEach((id, index) => {
        new aws.ec2.RouteTableAssociation(`pub-rt-assoc-${index}`, {
            subnetId: id,
            routeTableId: publicRouteTable.id,
        });
    });

    return { igw, publicRouteTable };
}
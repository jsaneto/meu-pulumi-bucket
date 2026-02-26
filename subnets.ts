import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi"; // Importação necessária para o tipo Input

interface SubnetArgs {
    vpcId: pulumi.Input<string>; // Aqui aceitamos tanto string quanto Output<string>
    az: string;
}

export function createSubnets(args: SubnetArgs) {
    // Criando a Subnet Pública
    const publicSubnet = new aws.ec2.Subnet("public-sn", {
        vpcId: args.vpcId,
        cidrBlock: "10.0.1.0/24",
        availabilityZone: args.az,
        mapPublicIpOnLaunch: true,
        tags: { Name: "pulumi-public" },
    });

    // Criando a Subnet Privada
    const privateSubnet = new aws.ec2.Subnet("private-sn", {
        vpcId: args.vpcId,
        cidrBlock: "10.0.2.0/24",
        availabilityZone: args.az,
        mapPublicIpOnLaunch: false,
        tags: { Name: "pulumi-private" },
    });

    return { publicSubnet, privateSubnet };
}
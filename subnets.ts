import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

interface SubnetArgs {
    vpcId: pulumi.Input<string>;
    azs: string[]; // Agora recebemos um array de strings
}

export function createSubnets(args: SubnetArgs) {
    const publicSubnets: aws.ec2.Subnet[] = [];
    const privateSubnets: aws.ec2.Subnet[] = [];

    args.azs.forEach((az, index) => {
        // Criando Subnet Pública
        // index 0 -> 10.0.1.0/24, index 1 -> 10.0.3.0/24...
        const pub = new aws.ec2.Subnet(`public-sn-${az}`, {
            vpcId: args.vpcId,
            cidrBlock: `10.0.${(index * 2) + 1}.0/24`,
            availabilityZone: az,
            mapPublicIpOnLaunch: true,
            tags: { Name: `pulumi-public-${az}` },
        });
        publicSubnets.push(pub);

        // Criando Subnet Privada
        // index 0 -> 10.0.2.0/24, index 1 -> 10.0.4.0/24...
        const priv = new aws.ec2.Subnet(`private-sn-${az}`, {
            vpcId: args.vpcId,
            cidrBlock: `10.0.${(index * 2) + 2}.0/24`,
            availabilityZone: az,
            mapPublicIpOnLaunch: false,
            tags: { Name: `pulumi-private-${az}` },
        });
        privateSubnets.push(priv);
    });

    return { publicSubnets, privateSubnets };
}
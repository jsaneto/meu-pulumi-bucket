import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createSharedFileSystem() {
    // 1. Descoberta Automática da Rede
    const defaultVpc = aws.ec2.getVpc({ default: true });
    const defaultSubnets = defaultVpc.then(vpc => 
        aws.ec2.getSubnets({ filters: [{ name: "vpc-id", values: [vpc.id] }] })
    );

    const vpcId = defaultVpc.then(vpc => vpc.id);

    // 2. Security Group do EFS
    const efsSg = new aws.ec2.SecurityGroup("efs-sg", {
        vpcId: vpcId,
        description: "Permite trafego NFS para o EFS",
        ingress: [{
            protocol: "tcp",
            fromPort: 2049,
            toPort: 2049,
            cidrBlocks: ["0.0.0.0/0"], // Porta padrão NFS
        }],
        egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
    });

    // 3. O Sistema de Arquivos
    const fileSystem = new aws.efs.FileSystem("my-efs", {
        encrypted: true,
        performanceMode: "generalPurpose",
        tags: { Name: "SharedData-ACG" },
    });

    // 4. Mount Targets (Criando em todas as sub-redes descobertas)
    const mountTargets = pulumi.output(defaultSubnets).apply(s => 
        s.ids.map((id, index) => 
            new aws.efs.MountTarget(`efs-mt-${index}`, {
                fileSystemId: fileSystem.id,
                subnetId: id,
                securityGroups: [efsSg.id],
            })
        )
    );

    return { fileSystem, efsSg };
}
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export const createRDSInstance = (
    name: string, 
    securityGroupId: pulumi.Input<string>,
    subnetIds: pulumi.Input<string>[],
    dbPassword: pulumi.Input<string> // <--- 1. NOVO PARÂMETRO
) => {
    // Criamos o grupo de subnets para o RDS
    const dbSubnetGroup = new aws.rds.SubnetGroup(`${name}-subnet-group`, {
        subnetIds: subnetIds,
        tags: { Name: "My DB Subnet Group" },
    });

    const db = new aws.rds.Instance(name, {
        instanceClass: "db.t3.micro",
        allocatedStorage: 20,
        engine: "postgres",       // Mudei para postgres para combinar com o Secret
        engineVersion: "18.3",    // Versão estável do Postgres
        dbName: "acgdb",
        username: "admin_user",   // Deve ser o mesmo que você colocou no Secret
        password: dbPassword,     // <--- 2. USA A SENHA DO SECRETS MANAGER

        dbSubnetGroupName: dbSubnetGroup.name, 
        vpcSecurityGroupIds: [securityGroupId],
        
        // DICA DE ARQUITETURA:
        // Em um ambiente real, deixamos isso como 'false' e acessamos via Bastion ou VPN.
        publiclyAccessible: true, 
        skipFinalSnapshot: true,
        deleteAutomatedBackups: true,
    });

    return db;
};
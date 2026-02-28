import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export const createRDSInstance = (
    name: string, 
    securityGroupId: pulumi.Input<string>,
    subnetIds: pulumi.Input<string>[] // <--- Adicione este parâmetro
) => {
    // Criamos o grupo de subnets para forçar o RDS a ficar na sua VPC Custom
    const dbSubnetGroup = new aws.rds.SubnetGroup(`${name}-subnet-group`, {
        subnetIds: subnetIds,
        tags: { Name: "My DB Subnet Group" },
    });

    const db = new aws.rds.Instance(name, {
        instanceClass: "db.t3.micro",
        allocatedStorage: 20,
        engine: "mysql",
        engineVersion: "8.0",
        dbName: "acgdb",
        username: "admin",
        password: "password123",
        
        // VINCULANDO À REDE CORRETA:
        dbSubnetGroupName: dbSubnetGroup.name, 
        vpcSecurityGroupIds: [securityGroupId],
        
        publiclyAccessible: true, // Nota: Para ser público, as subnets em 'subnetIds' devem ser públicas
        skipFinalSnapshot: true,
        deleteAutomatedBackups: true,
    });

    return db;
};
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export const createRDSInstance = (
    name: string, 
    securityGroupId: pulumi.Input<string>,
    subnetIds: pulumi.Input<string>[],
    dbPassword: pulumi.Input<string>
) => {
    // 1. Grupo de Subnets (Compartilhado entre as instâncias)
    const dbSubnetGroup = new aws.rds.SubnetGroup(`${name}-subnet-group`, {
        subnetIds: subnetIds,
        tags: { Name: "My DB Subnet Group" },
    });

    // 2. Instância PRIMÁRIA (Escrita e Leitura)
    const dbPrimary = new aws.rds.Instance(name, {
        instanceClass: "db.t3.micro",
        allocatedStorage: 20,
        engine: "postgres",
        engineVersion: "18.3", // Corrigido para uma versão disponível (18 ainda não existe no RDS)
        dbName: "acgdb",
        username: "admin_user",
        password: dbPassword,
        dbSubnetGroupName: dbSubnetGroup.name, 
        vpcSecurityGroupIds: [securityGroupId],
        publiclyAccessible: true, 
        skipFinalSnapshot: true,
        // IMPORTANTE: Para ter réplicas, o backup automático deve estar ATIVO ( > 0 )
        backupRetentionPeriod: 7, 
    });

    // 3. READ REPLICA (Apenas Leitura)
    // DICA: Geralmente colocamos a réplica em uma AZ diferente para resiliência
    const dbReplica = new aws.rds.Instance(`${name}-replica`, {
        replicateSourceDb: dbPrimary.id, // O segredo está aqui: conecta à primária
        instanceClass: "db.t3.micro",   // Pode ser diferente da primária se quiser economizar
        publiclyAccessible: true,
        vpcSecurityGroupIds: [securityGroupId],
        skipFinalSnapshot: true,
        parameterGroupName: "default.postgres18", // Deve ser compatível com a primária
    }, { dependsOn: [dbPrimary] }); // Garante que a primária suba primeiro

    return {
        primary: dbPrimary,
        replica: dbReplica
    };
};
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

interface ObservabilityArgs {
    dbInstanceId: pulumi.Input<string>;
    sqsQueueName: pulumi.Input<string>;
    snsTopicArn: pulumi.Input<string>;
    asgName: pulumi.Input<string>;
}

export function createObservabilityStack(args: ObservabilityArgs) {
    
    // --- 1. ALARME DE CONEXÕES NO RDS ---
    // Alerta se o número de conexões simultâneas for muito alto (evita travamento do banco)
    const rdsConnectionAlarm = new aws.cloudwatch.MetricAlarm("rds-high-connections", {
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 1,
        metricName: "DatabaseConnections",
        namespace: "AWS/RDS",
        period: 60,
        statistic: "Average",
        threshold: 50, 
        alarmDescription: "Alerta: Número de conexões no banco está muito alto.",
        dimensions: {
            DBInstanceIdentifier: args.dbInstanceId,
        },
        alarmActions: [args.snsTopicArn],
    });

    // --- 2. ALARME DE FILA SQS (BACKLOG) ---
    // Alerta se houver mensagens acumuladas (indica que as instâncias EC2 não estão processando)
    const sqsBacklogAlarm = new aws.cloudwatch.MetricAlarm("sqs-high-backlog", {
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 1,
        metricName: "ApproximateNumberOfMessagesVisible",
        namespace: "AWS/SQS",
        period: 60,
        statistic: "Sum",
        threshold: 100,
        dimensions: {
            QueueName: args.sqsQueueName,
        },
        alarmActions: [args.snsTopicArn],
    });

    // --- 3. DASHBOARD OPERACIONAL ---
    // Cria o painel visual no console da AWS
    const mainDashboard = new aws.cloudwatch.Dashboard("infra-dashboard-resource", {
        // Nome físico que aparecerá na lista de Dashboards da AWS
        dashboardName: "PainelGeralInfraestrutura", 
        
        dashboardBody: pulumi.jsonStringify({
            widgets: [
                {
                    type: "metric",
                    x: 0, y: 0, width: 12, height: 6,
                    properties: {
                        metrics: [
                            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", args.dbInstanceId],
                            [".", "DatabaseConnections", ".", "."]
                        ],
                        period: 300,
                        stat: "Average",
                        region: "us-east-1",
                        title: "Performance do Banco de Dados (RDS)"
                    }
                },
                {
                    type: "metric",
                    x: 12, y: 0, width: 12, height: 6,
                    properties: {
                        metrics: [
                            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", args.sqsQueueName]
                        ],
                        period: 60,
                        stat: "Sum",
                        region: "us-east-1",
                        title: "Saúde da Fila (SQS)"
                    }
                },
                {
                    type: "metric",
                    x: 0, y: 6, width: 24, height: 6,
                    properties: {
                        metrics: [
                            ["AWS/AutoScaling", "GroupDesiredCapacity", "AutoScalingGroupName", args.asgName],
                            [".", "GroupInServiceInstances", ".", "."]
                        ],
                        period: 300,
                        stat: "Average",
                        region: "us-east-1",
                        title: "Status do Auto Scaling (Máquinas em Serviço)"
                    }
                }
            ]
        })
    });

    return {
        dashboardName: mainDashboard.dashboardName,
        connectionAlarmArn: rdsConnectionAlarm.arn,
        backlogAlarmArn: sqsBacklogAlarm.arn
    };
}
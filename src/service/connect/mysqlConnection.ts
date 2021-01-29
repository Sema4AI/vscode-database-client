import { Node } from "@/model/interface/node";
import * as fs from "fs";
import * as mysql from "mysql2";
import { TypecastField } from "mysql2";
import { IConnection, queryCallback } from "./connection";
import { dumpTypeCast } from './convert/mysqlTypeCast';

export class MysqlConnection extends IConnection {
    private con: mysql.Connection;
    constructor(node: Node) {
        super()
        const newConnectionOptions = {
            host: node.host, port: node.port, user: node.user, password: node.password, database: node.database,
            timezone: node.timezone,
            multipleStatements: true, dateStrings: true, supportBigNumbers: true, bigNumberStrings: true,
            connectTimeout: node.connectTimeout||5000,
            typeCast: (field, next) => {
                if (this.dumpMode) return dumpTypeCast(field as TypecastField)
                const buf = field.buffer();
                if (field.type == 'BIT') {
                    return this.bitToBoolean(buf)
                }
                return buf?.toString();
            }
        } as mysql.ConnectionConfig;
        if (node.certPath && fs.existsSync(node.certPath)) {
            newConnectionOptions.ssl = {
                ca: fs.readFileSync(node.certPath),
            };
        }
        this.con = mysql.createConnection(newConnectionOptions);
    }
    isAlive(): boolean {
        return !this.dead && (this.con.state == 'authenticated' || this.con.authorized)
    }
    query(sql: string, callback?: queryCallback): void;
    query(sql: string, values: any, callback?: queryCallback): void;
    query(sql: any, values?: any, callback?: any) {
        return this.con.query(sql, values, callback)
    }
    connect(callback: (err: Error) => void): void {
        this.con.connect(callback)
        this.con.on("error", () => {
            this.dead = true;
        })
        this.con.on("end", () => {
            this.dead = true;
        })
    }
    beginTransaction(callback: (err: Error) => void): void {
        this.con.beginTransaction(callback)
    }
    rollback(): void {
        this.con.rollback()
    }
    commit(): void {
        this.con.commit()
    }
    end(): void {
        this.dead = true;
        this.con.end()
    }

    bitToBoolean(buf: Buffer): any {
        return buf ? buf[0] == 1 : null;
    }

}
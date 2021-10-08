const express = require('express');
const app = express();
const PORT = 8000;
const sqlite3 = require('sqlite3').verbose();
const Joi = require('joi');

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function openDB(){
    return new sqlite3.Database('./db/assessment.sqlite', (err) => {
        if (err) {
          console.error(err.message);
        }
        console.log('Connected to the sqlite database.');
    });
}

const schema = Joi.object({
    name: Joi.string()
        .min(3)
        .pattern(new RegExp('^[a-zA-Z ]*$'))
        .required()
        .error( errors => {
            errors.forEach( error => {
                switch (error.code) {
                    case "string.pattern.base":
                        error.message = '"name" must only contain letters and spaces';
                        break;
                    default:
                        break;
                }
            })
            return errors;
        }),
    monthly_salary: Joi.number().less(100000)
})

app.get('/api/employee/:name', (req, res) => {
    
    const {error, value} = schema.validate(req.params);
    
    if (error) {
        res.status(500).send({"message" : error.details[0].message});
    } else {
        let db = openDB();
        var data = [
            req.params.name,
        ];
        let sql = "SELECT * FROM employees WHERE name = ?";
    
        db.get(sql, data, (err, row) => {
            if (err) throw err;
            if (typeof row !== "undefined") {
                
                const { salary, tax_payable } = computeTaxPayable(row);
                
                res.send({
                    "name": row.name,
                    "salary": salary,
                    "tax_payable": tax_payable
                });
            } else {
                res.send({
                    "message": "The record does not exist in DB"
                });
            }
        });
        db.close();
    }
});

app.put('/api/employee', (req, res) => {

    let db = openDB();
    
    var data = [
        req.body.name,
    ];
    let sql = "SELECT * FROM employees WHERE name = ?";

    db.get(sql, data, (err, row) => {
        if (err) throw err;
        if (typeof row !== "undefined") {
            var data = [
                req.body.monthly_salary,
                req.body.name,
            ];

            let sql = 'UPDATE employees SET monthly_salary = ? WHERE name = ?';

            db.run(sql, data, (err) => {
                if (err) throw err;
                res.send({
                    "message": "The record is updated"
                });
            });
        } else {
            res.send({
                "message": "The record does not exist in DB"
            });
        }
    });

    db.close();
});

function computeTaxPayable(employee){
    const annualIncome = employee.monthly_salary * 12;

    var firstCal = 0;
    var rate = 0;
    var tax = 0;
    
    switch(true) {
        case (annualIncome <= 5000):
            firstCal = 5000;
            rate = 0;
            tax = 0;
            break;
        case (50001 <= annualIncome && annualIncome <= 20000):
            firstCal = 5000;
            rate = 1;
            tax = 0;
            break;
        case (20001 <= annualIncome && annualIncome <= 35000):
            firstCal = 20000;
            rate = 3;
            tax = 150;
            break;
        case (35001 <= annualIncome && annualIncome <= 50000):
            firstCal = 35000;
            rate = 8;
            tax = 600;
            break;
        case (50001 <= annualIncome && annualIncome <= 70000):
            firstCal = 50000;
            rate = 14;
            tax = 1800;
            break;        
        case (70001 <= annualIncome && annualIncome <= 100000):
            firstCal = 70000;
            rate = 21;
            tax = 4600;
            break;
        case (100001 <= annualIncome && annualIncome <= 250000):
            firstCal = 100000;
            rate = 24;
            tax = 10900;
            break;
        case (250001 <= annualIncome && annualIncome <= 400000):
            firstCal = 250000;
            rate = 24.5;
            tax = 46900;
            break;
        case (400001 <= annualIncome && annualIncome <= 600000):
            firstCal = 400000;
            rate = 25;
            tax = 83650;
            break;
        default:
            console.log("Out of range");
            break;
    }

    const excess = (annualIncome - firstCal) * 100;
    const taxPayable = (excess * (rate/100)) + (tax * 100);
    
    return {
        "salary": annualIncome * 100,
        "tax_payable": taxPayable
    }
}


app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
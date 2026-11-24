const Sequelize = require('sequelize');
const ExpensePriceRule = require('../models/expencePriceRule');
const message = require('../response_message/message');
var nearest = require('nearest-date');
const ExpenseHead = require('../models/expenseHead');

exports.postAddExpensePriceRule = async (req, res, next) => {
  try {
    let { expenseHeadId, rule, applicableDate } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    let maindate = [];
    let get_one_data = await ExpensePriceRule.findAll({
      where: {
        expenseHeadId: expenseHeadId,
        status: ['0', '1'],
      },
    });

    for (var i = 0; i < get_one_data.length; i++) {
      maindate.push(new Date(get_one_data[i].applicableDate));
    }
    if (get_one_data.length > 0) {
      let get_deactive = await ExpensePriceRule.findAll({
        where: {
          expenseHeadId: expenseHeadId,
          status: 0,
        },
      });

      let date = [];
      for (var i = 0; i < get_deactive.length; i++) {
        date.push(new Date(get_deactive[i].applicableDate));
      }
      date.push(new Date(applicableDate));

      date.sort((val1, val2) => {
        return new Date(val1) - new Date(val2);
      });
      let get_one_data1 = await ExpensePriceRule.findOne({
        where: {
          expenseHeadId: expenseHeadId,
          status: 1,
        },
      });
      if (get_one_data1) {
        var index = nearest(date, new Date(get_one_data1.applicableDate));
        if (new Date(get_one_data1.applicableDate) > new Date(applicableDate)) {
          const result = maindate.filter(checkdate);

          function checkdate(date) {
            return (
              date.toISOString().slice(0, 10) ==
              new Date().toISOString().slice(0, 10)
            );
          }
          if (result.length > 0) {
            let status = 0;
            let date2 = [];
            let get_deactive1 = await ExpensePriceRule.findAll({
              where: {
                expenseHeadId: expenseHeadId,
                status: [0, 1],
              },
            });
            for (var i = 0; i < get_deactive1.length; i++) {
              date2.push(new Date(get_deactive1[i].applicableDate));
            }

            const result = date2.filter(checkdate);

            function checkdate(date) {
              return new Date(date) > new Date(applicableDate);
            }
            var index2 = nearest(result, new Date(applicableDate));
            let insert_db_status = await ExpensePriceRule.create({
              expenseHeadId,
              rule,
              applicableDate,
              endDate: new Date(result[index2].getTime() - 86400000),
              status,
              createBy,
              createByIp,
            });

            const result1 = date2.filter(checkdate1);

            function checkdate1(date) {
              return new Date(date) < new Date(applicableDate);
            }
            if (result1.length > 0) {
              var index3 = nearest(
                result1,
                new Date(insert_db_status.applicableDate),
              );

              let new1 = new Date(insert_db_status.applicableDate);
              let datachange1 = await ExpensePriceRule.update(
                {
                  endDate: new Date(new1 - 3600 * 1000 * 24),
                },
                {
                  where: {
                    applicableDate: new Date(result1[index3]),
                  },
                },
              );
            }
          } else if (
            new Date(get_one_data1.applicableDate) > new Date(applicableDate)
          ) {
            let get_deactive1 = await ExpensePriceRule.findAll({
              where: {
                expenseHeadId: expenseHeadId,
              },
            });
            let status = 0;

            let date1 = [];
            for (var i = 0; i < get_deactive1.length; i++) {
              date1.push(new Date(get_deactive1[i].applicableDate));
            }

            const result = date1.filter(checkdate);

            function checkdate(date) {
              return new Date(date) > new Date(applicableDate);
            }
            var index1 = nearest(result, new Date(applicableDate));

            let insert_db_status = await ExpensePriceRule.create({
              expenseHeadId,
              rule,
              applicableDate,
              endDate: new Date(result[index1].getTime() - 86400000),
              status,
              createBy,
              createByIp,
            });
            const result1 = date1.filter(checkdate1);

            function checkdate1(date) {
              return new Date(date) < new Date(applicableDate);
            }
            if (result1.length > 0) {
              var index3 = nearest(
                result1,
                new Date(insert_db_status.applicableDate),
              );
              let new1 = new Date(insert_db_status.applicableDate);
              let datachange1 = await ExpensePriceRule.update(
                {
                  endDate: new Date(new1 - 3600 * 1000 * 24),
                },
                {
                  where: {
                    applicableDate: new Date(result1[index3]),
                  },
                },
              );
            }
          } else {
            let get_deactive1 = await ExpensePriceRule.findAll({
              where: {
                expenseHeadId: expenseHeadId,
                status: [0, 1],
              },
            });
            let status = 1;

            let date1 = [];
            for (var i = 0; i < get_deactive1.length; i++) {
              date1.push(new Date(get_deactive1[i].applicableDate));
            }

            const result = date1.filter(checkdate);

            function checkdate(date) {
              return new Date(date) > new Date(applicableDate);
            }
            var index1 = nearest(result, new Date(applicableDate));

            let insert_db_status = await ExpensePriceRule.create({
              expenseHeadId,
              rule,
              applicableDate,
              endDate: new Date(result[index1].getTime() - 86400000),
              status,
              createBy,
              createByIp,
            });
          }
        } else if (
          new Date(get_one_data1.applicableDate).toISOString().slice(0, 10) ==
            new Date().toISOString().slice(0, 10) &&
          new Date().getDate() == new Date(applicableDate).getDate()
        ) {
          let new1 = new Date(applicableDate);
          let datachange1 = await ExpensePriceRule.update(
            {
              status: 0,
              endDate: new Date(new1),
            },
            {
              where: {
                expenseHeadId: expenseHeadId,
                status: 1,
              },
            },
          );
          let get_deactive3 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: 0,
            },
          });
          let date4 = [];
          for (var i = 0; i < get_deactive3.length; i++) {
            date4.push(new Date(get_deactive3[i].applicableDate));
          }
          const result = date4.filter(checkdate);

          function checkdate(date) {
            return new Date(date) > new Date(applicableDate);
          }
          var index4 = nearest(result, new Date(applicableDate));
          let status = 1;

          if (result.length > 0) {
            let insert_db_status = await ExpensePriceRule.create({
              expenseHeadId,
              rule,
              applicableDate,
              endDate: new Date(result[index4].getTime() - 86400000),
              status,
              createBy,
              createByIp,
            });
          } else {
            let insert_db_status = await ExpensePriceRule.create({
              expenseHeadId,
              rule,
              applicableDate,
              status,
              createBy,
              createByIp,
            });
          }
        } else if (
          new Date(applicableDate).toISOString().slice(0, 10) ==
          new Date().toISOString().slice(0, 10)
        ) {
          let new1 = new Date(applicableDate);
          let datachange1 = await ExpensePriceRule.update(
            {
              status: 0,
              endDate: new Date(new1 - 3600 * 1000 * 24),
            },
            {
              where: {
                expenseHeadId: expenseHeadId,
                status: 1,
              },
            },
          );
          let get_deactive3 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: 0,
            },
          });
          let date4 = [];
          for (var i = 0; i < get_deactive3.length; i++) {
            date4.push(new Date(get_deactive3[i].applicableDate));
          }
          const result = date4.filter(checkdate);

          function checkdate(date) {
            return new Date(date) > new Date(applicableDate);
          }
          var index4 = nearest(result, new Date(applicableDate));
          let status = 1;

          if (result.length > 0) {
            let insert_db_status = await ExpensePriceRule.create({
              expenseHeadId,
              rule,
              applicableDate,
              endDate: new Date(result[index4].getTime() - 86400000),
              status,
              createBy,
              createByIp,
            });
          } else {
            let insert_db_status = await ExpensePriceRule.create({
              expenseHeadId,
              rule,
              applicableDate,
              status,
              createBy,
              createByIp,
            });
          }
        } else if (
          new Date(applicableDate).toISOString().slice(0, 10) ==
          new Date(get_one_data1.applicableDate).toISOString().slice(0, 10)
        ) {
          return res.status(200).json({
            status: 401,
            message: message.usermessage.applicabledate,
            data: {},
          });
        } else if (
          new Date(get_one_data1.applicableDate) < new Date(applicableDate) &&
          new Date(applicableDate) < new Date()
        ) {
          let new1 = new Date(applicableDate);
          let datachange1 = await ExpensePriceRule.update(
            {
              status: 0,
              endDate: new Date(new1 - 3600 * 1000 * 24),
            },
            {
              where: {
                expenseHeadId: expenseHeadId,
                status: 1,
              },
            },
          );
          let status = 1;
          let insert_db_status = await ExpensePriceRule.create({
            expenseHeadId,
            rule,
            applicableDate,
            status,
            createBy,
            createByIp,
          });
          let get_deactive1 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: 0,
            },
          });
          let date1 = [];
          for (var i = 0; i < get_deactive1.length; i++) {
            date1.push(get_deactive1[i].applicableDate);
          }
          const result = date1.filter(checkdate);

          function checkdate(date) {
            return new Date(date) > new Date(applicableDate);
          }

          var index1 = nearest(result, new Date(applicableDate));

          let datachange = await ExpensePriceRule.update(
            {
              endDate: new Date(result[index1].getTime() - 86400000),
            },
            {
              where: {
                expenseHeadId: expenseHeadId,
                status: 1,
              },
            },
          );
        } else if (
          new Date(get_one_data1.applicableDate) < new Date(applicableDate)
        ) {
          let status = 0;
          let insert_db_status = await ExpensePriceRule.create({
            expenseHeadId,
            rule,
            applicableDate,
            status,
            createBy,
            createByIp,
          });
          let get_deactive1 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: 0,
            },
          });
          let date1 = [];
          for (var i = 0; i < get_deactive1.length; i++) {
            date1.push(get_deactive1[i].applicableDate);
          }

          const result = date1.filter(checkdate);

          function checkdate(date) {
            return new Date(date) > new Date(get_one_data1.applicableDate);
          }

          var index1 = nearest(result, new Date(get_one_data1.applicableDate));
          let datachange = await ExpensePriceRule.update(
            {
              endDate: new Date(result[index1].getTime() - 86400000),
            },
            {
              where: {
                expenseHeadId: expenseHeadId,
                status: 1,
              },
            },
          );
        } else {
          let status = 0;
          let insert_db_status = await ExpensePriceRule.create({
            expenseHeadId,
            rule,
            applicableDate,
            status,
            createBy,
            createByIp,
          });
          let get_deactive1 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: 0,
            },
          });
          let date1 = [];
          for (var i = 0; i < get_deactive1.length; i++) {
            date1.push(get_deactive1[i].applicableDate);
          }

          const result = date1.filter(checkdate);

          function checkdate(date) {
            return new Date(date) >= new Date(applicableDate);
          }
          var index1 = nearest(result, new Date(get_one_data1.applicableDate));
          let datachange = await ExpensePriceRule.update(
            {
              endDate: new Date(result[index1].getTime() - 86400000),
            },
            {
              where: {
                expenseHeadId: expenseHeadId,
                status: 1,
              },
            },
          );
        }
      } else {
        if (
          new Date(applicableDate).toISOString().slice(0, 10) <
          new Date().toISOString().slice(0, 10)
        ) {
          let status = 1;
          let date1 = [];
          let get_deactive1 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: [0, 1],
            },
          });
          for (var i = 0; i < get_deactive1.length; i++) {
            date1.push(new Date(get_deactive1[i].applicableDate));
          }
          const result = date1.filter(checkdate);

          function checkdate(date) {
            return new Date(date) > new Date(applicableDate);
          }
          var index1 = nearest(result, new Date(applicableDate));

          let insert_db_status = await ExpensePriceRule.create({
            expenseHeadId,
            rule,
            endDate: new Date(result[index1].getTime() - 86400000),
            applicableDate,
            status,
            createBy,
            createByIp,
          });
        } else if (
          new Date(applicableDate).toISOString().slice(0, 10) ==
          new Date().toISOString().slice(0, 10)
        ) {
          let status = 1;
          let date1 = [];
          let get_deactive1 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: [0, 1],
            },
          });
          for (var i = 0; i < get_deactive1.length; i++) {
            date1.push(new Date(get_deactive1[i].applicableDate));
          }
          const result = date1.filter(checkdate);
          var index1 = nearest(result, new Date(applicableDate));
          function checkdate(date) {
            return new Date(date) > new Date(applicableDate);
          }
          if (result.length > 0) {
            let insert_db_status = await ExpensePriceRule.create({
              expenseHeadId,
              rule,
              applicableDate,
              endDate: new Date(result[index1].getTime() - 86400000),
              status,
              createBy,
              createByIp,
            });
          } else {
            let insert_db_status = await ExpensePriceRule.create({
              expenseHeadId,
              rule,
              applicableDate,
              endDate: null,
              status,
              createBy,
              createByIp,
            });
          }
        } else {
          let status = 0;
          let insert_db_status = await ExpensePriceRule.create({
            expenseHeadId,
            rule,
            applicableDate,
            status,
            createBy,
            createByIp,
          });
        }

        return res.status(200).json({
          status: 200,
          message: message.usermessage.expensepriceruleadd,
          data: {},
        });
      }

      return res.status(200).json({
        status: 200,
        message: message.usermessage.expensepriceruleadd,
        data: {},
      });
    } else {
      if (new Date(applicableDate) < new Date()) {
        let status = 1;
        let insert_db_status = await ExpensePriceRule.create({
          expenseHeadId,
          rule,
          applicableDate,
          status,
          createBy,
          createByIp,
        });
      } else if (
        new Date(applicableDate).toISOString().slice(0, 10) ==
        new Date().toISOString().slice(0, 10)
      ) {
        let status = 1;
        let insert_db_status = await ExpensePriceRule.create({
          expenseHeadId,
          rule,
          applicableDate,
          status,
          createBy,
          createByIp,
        });
      } else {
        let status = 0;
        let insert_db_status = await ExpensePriceRule.create({
          expenseHeadId,
          rule,
          applicableDate,
          status,
          createBy,
          createByIp,
        });
      }

      return res.status(200).json({
        status: 200,
        message: message.usermessage.expensepriceruleadd,
        data: {},
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getExpensePriceRuleByHeadId = async (req, res, next) => {
  try {
    let get_one_data = await ExpensePriceRule.findAll({
      where: {
        expenseHeadId: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      order: [['applicableDate', 'ASC']],
      include: [
        {
          model: ExpenseHead,
          as: 'expensehead',
        },
      ],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateExpensePriceRule = async (req, res, next) => {
  try {
    let { expensePriceRuleID, expenseHeadId, rule, applicableDate } =
      await req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    let updatedata = await ExpensePriceRule.findOne({
      where: {
        expensePriceRuleID: expensePriceRuleID,
      },
    });
    let maindate = [];
    let get_one_data = await ExpensePriceRule.findAll({
      where: {
        expenseHeadId: expenseHeadId,
        status: ['0', '1'],
      },
    });

    for (var i = 0; i < get_one_data.length; i++) {
      maindate.push(new Date(get_one_data[i].applicableDate));
    }
    if (get_one_data.length > 0) {
      let get_deactive = await ExpensePriceRule.findAll({
        where: {
          expenseHeadId: expenseHeadId,
          status: 0,
        },
      });

      let date = [];
      for (var i = 0; i < get_deactive.length; i++) {
        date.push(new Date(get_deactive[i].applicableDate));
      }
      date.push(new Date(applicableDate));

      date.sort((val1, val2) => {
        return new Date(val1) - new Date(val2);
      });
      let get_one_data1 = await ExpensePriceRule.findOne({
        where: {
          expenseHeadId: expenseHeadId,
          status: 1,
        },
      });
      if (get_one_data1) {
        var index = nearest(date, new Date(get_one_data1.applicableDate));
        if (new Date(get_one_data1.applicableDate) > new Date(applicableDate)) {
          const result = maindate.filter(checkdate);

          function checkdate(date) {
            return (
              date.toISOString().slice(0, 10) ==
              new Date().toISOString().slice(0, 10)
            );
          }
          if (result.length > 0) {
            if (updatedata.status == 1) {
              let status = 1;
              let date2 = [];
              let get_deactive1 = await ExpensePriceRule.findAll({
                where: {
                  expenseHeadId: expenseHeadId,
                  status: [0, 1],
                  expensePriceRuleID: {
                    [Sequelize.Op.ne]: updatedata.expensePriceRuleID,
                  },
                },
              });
              for (var i = 0; i < get_deactive1.length; i++) {
                date2.push(new Date(get_deactive1[i].applicableDate));
              }

              const result = date2.filter(checkdate);

              function checkdate(date) {
                return new Date(date) > new Date(applicableDate);
              }
              var index2 = nearest(result, new Date(applicableDate));
              if (result.length > 0) {
                let change_data_status = await ExpensePriceRule.update(
                  {
                    expenseHeadId,
                    rule,
                    applicableDate,
                    endDate: new Date(result[index2].getTime() - 86400000),
                    status,
                    updateBy,
                    updateByIp,
                  },
                  {
                    where: { expensePriceRuleID: expensePriceRuleID },
                  },
                );
              } else {
                let change_data_status = await ExpensePriceRule.update(
                  {
                    expenseHeadId,
                    rule,
                    applicableDate,
                    endDate: null,
                    status,
                    updateBy,
                    updateByIp,
                  },
                  {
                    where: { expensePriceRuleID: expensePriceRuleID },
                  },
                );
              }

              const result1 = date2.filter(checkdate1);

              function checkdate1(date) {
                return new Date(date) < new Date(applicableDate);
              }

              if (result1.length > 0) {
                var index3 = nearest(result1, new Date(applicableDate));

                let new1 = new Date(applicableDate);
                let datachange1 = await ExpensePriceRule.update(
                  {
                    endDate: new Date(new1 - 3600 * 1000 * 24),
                  },
                  {
                    where: {
                      applicableDate: new Date(result1[index3]),
                    },
                  },
                );
              } else {
                let data4 = [];
                let get_deactive2 = await ExpensePriceRule.findAll({
                  where: {
                    expenseHeadId: expenseHeadId,
                    status: [0, 1],
                  },
                });
                for (var i = 0; i < get_deactive2.length; i++) {
                  data4.push(new Date(get_deactive2[i].applicableDate));
                }

                const result4 = data4.filter(checkdate);

                function checkdate(date) {
                  return new Date(date) > new Date(applicableDate);
                }
                var index5 = nearest(result4, new Date(applicableDate));

                let datachange1 = await ExpensePriceRule.update(
                  {
                    endDate: new Date(result4[index5].getTime() - 86400000),
                  },
                  {
                    where: {
                      applicableDate: new Date(applicableDate),
                    },
                  },
                );
              }
            } else {
              let status = 0;
              let date2 = [];
              let get_deactive1 = await ExpensePriceRule.findAll({
                where: {
                  expenseHeadId: expenseHeadId,
                  status: [0, 1],
                },
              });
              for (var i = 0; i < get_deactive1.length; i++) {
                date2.push(new Date(get_deactive1[i].applicableDate));
              }

              const result = date2.filter(checkdate);

              function checkdate(date) {
                return new Date(date) > new Date(applicableDate);
              }
              var index2 = nearest(result, new Date(applicableDate));
              let change_data_status = await ExpensePriceRule.update(
                {
                  expenseHeadId,
                  rule,
                  applicableDate,
                  endDate: new Date(result[index2].getTime() - 86400000),
                  status,
                  updateBy,
                  updateByIp,
                },
                {
                  where: { expensePriceRuleID: expensePriceRuleID },
                },
              );

              const result1 = date2.filter(checkdate1);

              function checkdate1(date) {
                return new Date(date) < new Date(applicableDate);
              }

              if (result1.length > 0) {
                var index3 = nearest(result1, new Date(applicableDate));
                let new1 = new Date(applicableDate);
                let datachange1 = await ExpensePriceRule.update(
                  {
                    endDate: new Date(new1 - 3600 * 1000 * 24),
                  },
                  {
                    where: {
                      applicableDate: new Date(result1[index3]),
                    },
                  },
                );
              } else {
                let data4 = [];
                let get_deactive2 = await ExpensePriceRule.findAll({
                  where: {
                    expenseHeadId: expenseHeadId,
                    status: [0, 1],
                  },
                });
                for (var i = 0; i < get_deactive2.length; i++) {
                  data4.push(new Date(get_deactive2[i].applicableDate));
                }
                const result4 = data4.filter(checkdate);

                function checkdate(date) {
                  return new Date(date) > new Date(applicableDate);
                }
                var index5 = nearest(result4, new Date(applicableDate));

                let datachange1 = await ExpensePriceRule.update(
                  {
                    endDate: new Date(result4[index5].getTime() - 86400000),
                  },
                  {
                    where: {
                      applicableDate: new Date(applicableDate),
                    },
                  },
                );
              }
            }
          } else if (
            new Date(get_one_data1.applicableDate) > new Date(applicableDate)
          ) {
            let get_deactive1 = await ExpensePriceRule.findAll({
              where: {
                expenseHeadId: expenseHeadId,
              },
            });
            let status = 0;

            let date1 = [];
            for (var i = 0; i < get_deactive1.length; i++) {
              date1.push(new Date(get_deactive1[i].applicableDate));
            }
            const result = date1.filter(checkdate);

            function checkdate(date) {
              return new Date(date) > new Date(applicableDate);
            }
            var index1 = nearest(result, new Date(applicableDate));

            let change_data_status = await ExpensePriceRule.update(
              {
                expenseHeadId,
                rule,
                applicableDate,
                endDate: new Date(result[index1].getTime() - 86400000),
                status,
                updateBy,
                updateByIp,
              },
              {
                where: { expensePriceRuleID: expensePriceRuleID },
              },
            );
            const result1 = date1.filter(checkdate1);

            function checkdate1(date) {
              return new Date(date) < new Date(applicableDate);
            }
            if (result1.length > 0) {
              var index3 = nearest(result1, new Date(applicableDate));
              let new1 = new Date(applicableDate);
              let datachange1 = await ExpensePriceRule.update(
                {
                  endDate: new Date(new1 - 3600 * 1000 * 24),
                },
                {
                  where: {
                    applicableDate: new Date(result1[index3]),
                  },
                },
              );
            }
          } else {
            let get_deactive1 = await ExpensePriceRule.findAll({
              where: {
                expenseHeadId: expenseHeadId,
                status: [0, 1],
              },
            });
            let status = 1;

            let date1 = [];
            for (var i = 0; i < get_deactive1.length; i++) {
              date1.push(new Date(get_deactive1[i].applicableDate));
            }

            const result = date1.filter(checkdate);

            function checkdate(date) {
              return new Date(date) > new Date(applicableDate);
            }
            var index1 = nearest(result, new Date(applicableDate));

            let change_data_status = await ExpensePriceRule.update(
              {
                expenseHeadId,
                rule,
                applicableDate,
                endDate: new Date(result[index1].getTime() - 86400000),
                status,
                updateBy,
                updateByIp,
              },
              {
                where: { expensePriceRuleID: expensePriceRuleID },
              },
            );
          }
        } else if (
          new Date(get_one_data1.applicableDate) == new Date() &&
          new Date().getDate() == new Date(applicableDate).getDate()
        ) {
          let new1 = new Date(applicableDate);
          let datachange1 = await ExpensePriceRule.update(
            {
              status: 0,
              endDate: new Date(new1),
            },
            {
              where: {
                expenseHeadId: expenseHeadId,
                status: 1,
              },
            },
          );
          let get_deactive3 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: 0,
            },
          });
          let date4 = [];
          for (var i = 0; i < get_deactive3.length; i++) {
            date4.push(new Date(get_deactive3[i].applicableDate));
          }
          const result = date4.filter(checkdate);

          function checkdate(date) {
            return new Date(date) > new Date(applicableDate);
          }
          var index4 = nearest(result, new Date(applicableDate));
          let status = 1;

          if (result.length > 0) {
            let change_data_status = await ExpensePriceRule.update(
              {
                expenseHeadId,
                rule,
                applicableDate,
                endDate: new Date(result[index4].getTime() - 86400000),
                status,
                updateBy,
                updateByIp,
              },
              {
                where: { expensePriceRuleID: expensePriceRuleID },
              },
            );
          } else {
            let change_data_status = await ExpensePriceRule.update(
              {
                expenseHeadId,
                rule,
                applicableDate,
                status,
                updateBy,
                updateByIp,
              },
              {
                where: { expensePriceRuleID: expensePriceRuleID },
              },
            );
          }
        } else if (
          new Date(applicableDate).toISOString().slice(0, 10) ==
          new Date().toISOString().slice(0, 10)
        ) {
          let new1 = new Date(applicableDate);
          let datachange1 = await ExpensePriceRule.update(
            {
              status: 0,
              endDate: new Date(new1 - 3600 * 1000 * 24),
            },
            {
              where: {
                expenseHeadId: expenseHeadId,
                status: 1,
              },
            },
          );
          let get_deactive3 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: 0,
            },
          });
          let date4 = [];
          for (var i = 0; i < get_deactive3.length; i++) {
            date4.push(new Date(get_deactive3[i].applicableDate));
          }
          const result = date4.filter(checkdate);

          function checkdate(date) {
            return new Date(date) > new Date(applicableDate);
          }
          var index4 = nearest(result, new Date(applicableDate));
          let status = 1;

          if (result.length > 0) {
            let change_data_status = await ExpensePriceRule.update(
              {
                expenseHeadId,
                rule,
                applicableDate,
                endDate: new Date(result[index4].getTime() - 86400000),
                status,
                updateBy,
                updateByIp,
              },
              {
                where: { expensePriceRuleID: expensePriceRuleID },
              },
            );
          } else {
            let change_data_status = await ExpensePriceRule.update(
              {
                expenseHeadId,
                rule,
                applicableDate,
                status,
                updateBy,
                updateByIp,
              },
              {
                where: { expensePriceRuleID: expensePriceRuleID },
              },
            );
          }
        } else if (
          new Date(applicableDate).toISOString().slice(0, 10) ==
          new Date(get_one_data1.applicableDate).toISOString().slice(0, 10)
        ) {
          return res.status(200).json({
            status: 401,
            message: message.usermessage.applicabledate,
            data: {},
          });
        } else if (
          new Date(get_one_data1.applicableDate) < new Date(applicableDate) &&
          new Date(applicableDate) < new Date()
        ) {
          let new1 = new Date(applicableDate);
          let datachange1 = await ExpensePriceRule.update(
            {
              status: 0,
              endDate: new Date(new1 - 3600 * 1000 * 24),
            },
            {
              where: {
                expenseHeadId: expenseHeadId,
                status: 1,
              },
            },
          );
          let status = 1;

          let change_data_status = await ExpensePriceRule.update(
            {
              expenseHeadId,
              rule,
              applicableDate,
              status,
              updateBy,
              updateByIp,
            },
            {
              where: { expensePriceRuleID: expensePriceRuleID },
            },
          );
          let get_deactive1 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: 0,
            },
          });
          let date1 = [];
          for (var i = 0; i < get_deactive1.length; i++) {
            date1.push(get_deactive1[i].applicableDate);
          }
          const result = date1.filter(checkdate);

          function checkdate(date) {
            return new Date(date) > new Date(applicableDate);
          }

          var index1 = nearest(result, new Date(applicableDate));

          let datachange = await ExpensePriceRule.update(
            {
              endDate: new Date(result[index1].getTime() - 86400000),
            },
            {
              where: {
                expenseHeadId: expenseHeadId,
                status: 1,
              },
            },
          );
        } else if (
          new Date(get_one_data1.applicableDate) < new Date(applicableDate)
        ) {
          let status = 0;

          let change_data_status = await ExpensePriceRule.update(
            {
              expenseHeadId,
              rule,
              applicableDate,
              endDate: null,
              status,
              updateBy,
              updateByIp,
            },
            {
              where: { expensePriceRuleID: expensePriceRuleID },
            },
          );
          let get_deactive1 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: [1, 0],
            },
          });
          let date1 = [];
          for (var i = 0; i < get_deactive1.length; i++) {
            date1.push(get_deactive1[i].applicableDate);
          }

          const result = date1.filter(checkdate);

          function checkdate(date) {
            return new Date(date) <= new Date(get_one_data1.applicableDate);
          }

          const result2 = date1.filter(checkdate1);

          function checkdate1(date) {
            return new Date(date) > new Date(get_one_data1.applicableDate);
          }

          var index1 = nearest(result, new Date(get_one_data1.applicableDate));
          var index2 = nearest(result2, new Date(result[index1]));

          let datachange = await ExpensePriceRule.update(
            {
              endDate: new Date(result2[index2].getTime() - 86400000),
            },
            {
              where: {
                applicableDate: new Date(result[index1]),
                status: 1,
              },
            },
          );
        } else {
          let status = 0;
          let change_data_status = await ExpensePriceRule.update(
            {
              expenseHeadId,
              rule,
              applicableDate,
              status,
              updateBy,
              updateByIp,
            },
            {
              where: { expensePriceRuleID: expensePriceRuleID },
            },
          );
          let get_deactive1 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: 0,
            },
          });
          let date1 = [];
          for (var i = 0; i < get_deactive1.length; i++) {
            date1.push(get_deactive1[i].applicableDate);
          }
          const result = date1.filter(checkdate);

          function checkdate(date) {
            return new Date(date) >= new Date(applicableDate);
          }
          var index1 = nearest(result, new Date(get_one_data1.applicableDate));
          let datachange = await ExpensePriceRule.update(
            {
              endDate: new Date(result[index1].getTime() - 86400000),
            },
            {
              where: {
                expenseHeadId: expenseHeadId,
                status: 1,
              },
            },
          );
        }
      } else {
        if (
          new Date(applicableDate).toISOString().slice(0, 10) <
          new Date().toISOString().slice(0, 10)
        ) {
          let status = 1;
          let date1 = [];
          let get_deactive1 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: [0, 1],
            },
          });
          for (var i = 0; i < get_deactive1.length; i++) {
            date1.push(new Date(get_deactive1[i].applicableDate));
          }
          const result = date1.filter(checkdate);

          function checkdate(date) {
            return new Date(date) > new Date(applicableDate);
          }
          var index1 = nearest(result, new Date(applicableDate));

          if (result.length > 0) {
            let change_data_status = await ExpensePriceRule.update(
              {
                expenseHeadId,
                rule,
                applicableDate,
                endDate: new Date(result[index1].getTime() - 86400000),
                status,
                updateBy,
                updateByIp,
              },
              {
                where: { expensePriceRuleID: expensePriceRuleID },
              },
            );
          } else {
            let change_data_status = await ExpensePriceRule.update(
              {
                expenseHeadId,
                rule,
                applicableDate,
                endDate: null,
                status,
                updateBy,
                updateByIp,
              },
              {
                where: { expensePriceRuleID: expensePriceRuleID },
              },
            );
          }
        } else if (
          new Date(applicableDate).toISOString().slice(0, 10) ==
          new Date().toISOString().slice(0, 10)
        ) {
          let status = 1;
          let date1 = [];
          let get_deactive1 = await ExpensePriceRule.findAll({
            where: {
              expenseHeadId: expenseHeadId,
              status: [0, 1],
            },
          });
          for (var i = 0; i < get_deactive1.length; i++) {
            date1.push(new Date(get_deactive1[i].applicableDate));
          }
          const result = date1.filter(checkdate);

          function checkdate(date) {
            return new Date(date) > new Date(applicableDate);
          }
          var index1 = nearest(result, new Date(applicableDate));

          let change_data_status = await ExpensePriceRule.update(
            {
              expenseHeadId,
              rule,
              applicableDate,
              endDate: new Date(result[index1].getTime() - 86400000),
              status,
              updateBy,
              updateByIp,
            },
            {
              where: { expensePriceRuleID: expensePriceRuleID },
            },
          );
        } else {
          let status = 0;
          let change_data_status = await ExpensePriceRule.update(
            {
              expenseHeadId,
              rule,
              applicableDate,
              status,
              updateBy,
              updateByIp,
            },
            {
              where: { expensePriceRuleID: expensePriceRuleID },
            },
          );
        }
        return res.status(200).json({
          status: 200,
          message: message.usermessage.expensepriceruleupdate,
          data: {},
        });
      }
    } else {
      if (
        new Date(applicableDate).toISOString().slice(0, 10) <
        new Date().toISOString().slice(0, 10)
      ) {
        let status = 1;
        let insert_db_status = await ExpensePriceRule.create({
          expenseHeadId,
          rule,
          applicableDate,
          status,
          createBy,
          createByIp,
        });
      } else if (
        new Date(applicableDate).toISOString().slice(0, 10) ==
        new Date().toISOString().slice(0, 10)
      ) {
        let status = 1;
        let change_data_status = await ExpensePriceRule.update(
          {
            expenseHeadId,
            rule,
            applicableDate,
            status,
            updateBy,
            updateByIp,
          },
          {
            where: { expensePriceRuleID: expensePriceRuleID },
          },
        );
      } else {
        let status = 0;
        let change_data_status = await ExpensePriceRule.update(
          {
            expenseHeadId,
            rule,
            applicableDate,
            status,
            updateBy,
            updateByIp,
          },
          {
            where: { expensePriceRuleID: expensePriceRuleID },
          },
        );
      }

      return res.status(200).json({
        status: 200,
        message: message.usermessage.expensepriceruleupdate,
        data: {},
      });
    }

    res.status(200).json({
      status: 200,
      message: message.usermessage.expensepriceruleupdate,
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteExpensePriceRuleById = async (req, res, next) => {
  try {
    let { expensePriceRuleID, expenseHeadId } = await req.body;
    let get_one_data1 = await ExpensePriceRule.findOne({
      where: {
        expensePriceRuleID: expensePriceRuleID,
      },
    });
    await ExpensePriceRule.update(
      {
        status: 2,
      },
      {
        where: { expensePriceRuleID: expensePriceRuleID },
      },
    );

    if (get_one_data1.status == 1) {
      let get_one_data2 = await ExpensePriceRule.findAll({
        where: {
          expenseHeadId: expenseHeadId,
          status: [1, 0],
        },
      });
      if (get_one_data2) {
        let date = [];
        for (var i = 0; i < get_one_data2.length; i++) {
          date.push(new Date(get_one_data2[i].applicableDate));
        }
        const result = date.filter(checkdate);
        var index1 = nearest(result, new Date(get_one_data1.applicableDate));
        function checkdate(date) {
          return new Date(date) > new Date(get_one_data1.applicableDate);
        }
        const result2 = date.filter(checkdate1);
        var index2 = nearest(result2, new Date(get_one_data1.applicableDate));
        function checkdate1(date) {
          return new Date(date) < new Date(get_one_data1.applicableDate);
        }

        if (result.length > 0 && result2.length > 0) {
          let get_one = await ExpensePriceRule.findOne({
            where: {
              applicableDate: new Date(result2[index2]),
            },
          });

          let backrecord = await ExpensePriceRule.update(
            {
              status: 1,
              endDate: new Date(result[index1].getTime() - 86400000),
            },
            {
              where: { expensePriceRuleID: get_one.expensePriceRuleID },
            },
          );
        } else if (result2.length > 0) {
          let backrecord = await ExpensePriceRule.update(
            {
              status: 1,
              endDate: null,
            },
            {
              where: { applicableDate: new Date(result2[index2]) },
            },
          );
        } else {
        }
      }
    } else {
      let get_one_data2 = await ExpensePriceRule.findAll({
        where: {
          expenseHeadId: expenseHeadId,
          status: [1, 0],
        },
      });
      let date = [];
      for (var i = 0; i < get_one_data2.length; i++) {
        date.push(new Date(get_one_data2[i].applicableDate));
      }
      const result = date.filter(checkdate);
      var index1 = nearest(result, new Date(get_one_data1.applicableDate));
      function checkdate(date) {
        return new Date(date) > new Date(get_one_data1.applicableDate);
      }
      const result2 = date.filter(checkdate1);
      var index2 = nearest(result2, new Date(get_one_data1.applicableDate));
      function checkdate1(date) {
        return new Date(date) < new Date(get_one_data1.applicableDate);
      }

      if (result.length > 0 && result2.length > 0) {
        let backrecord = await ExpensePriceRule.update(
          {
            endDate: new Date(result[index1].getTime() - 86400000),
          },
          {
            where: { applicableDate: new Date(result2[index2]) },
          },
        );
      } else if (result2.length > 0) {
        let status = 1;

        let backrecord = await ExpensePriceRule.update(
          {
            endDate: null,
          },
          {
            where: { applicableDate: new Date(result2[index2]) },
          },
        );
      } else {
      }
    }

    res.status(200).json({
      status: 200,
      message: message.usermessage.expensepriceruledelete,
    });
  } catch (err) {
    next(err);
  }
};

exports.getExpensePriceRuleByHeadid = async (req, res, next) => {
  try {
    const get_one_data = await ExpensePriceRule.findOne({
      where: {
        expenseHeadId: req.params.id,
        status: 1,
      },
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

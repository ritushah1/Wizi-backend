const { Joi } = require('../utils/joi')
const {
  EmployeeGoalStatusEnum,
  GoalEvaluationPeriodEnum,
  ReviewPeriodEnum,
} = require('../utils/dbUtils')

const bulkCreateEmployeeGoalSchema = Joi.object({
  goalMasterId: Joi.number().required(),
  userMasterID: Joi.number().required(),
  company: Joi.number().required(),
  evaluationPeriod: Joi.string().required(),
  startDate: Joi.string().required(),
  endDate: Joi.string().required(),
  reviewerRole: Joi.string().required(),
  reviewType: Joi.string().required(),
  remarks: Joi.string().required(),
  reviewPeriod: Joi.string().required(),
  bulkData: Joi.array()
    .items(
      Joi.object({
        reviewerId: Joi.number().required(),
        startDate: Joi.when(Joi.ref('/reviewPeriod'), {
          is: Joi.valid(
            ReviewPeriodEnum.DAILY,
            ReviewPeriodEnum.WEEKLY,
            ReviewPeriodEnum.FORTNIGHTLY
          ),
          then: Joi.forbidden(),
          otherwise: Joi.number().required(),
        }),

        noDays: Joi.when(Joi.ref('/reviewPeriod'), {
          is: Joi.valid(
            ReviewPeriodEnum.DAILY,
            ReviewPeriodEnum.WEEKLY,
            ReviewPeriodEnum.FORTNIGHTLY
          ),
          then: Joi.forbidden(),
          otherwise: Joi.number().required(),
        }),
      })
    )
    .required(),
})

const updateEmployeeGoalSchema = Joi.object({
  targetGiven: Joi.number(),
  targetAchieved: Joi.number(),
  goalMasterId: Joi.number(),
  userMasterID: Joi.number(),
  remarks: Joi.string(),
  startDate: Joi.string().required(),
  endDate: Joi.string().required(),
  reviewerRole: Joi.string().required(),
  reviewType: Joi.string().required(),
  reviewPeriod: Joi.string().required(),
  status: Joi.string().valid(...Object.values(EmployeeGoalStatusEnum)),
  bulkData: Joi.array()
    .items(
      Joi.object({
        reviewerId: Joi.number().required(),
        startDate: Joi.when(Joi.ref('/reviewPeriod'), {
          is: Joi.valid(
            ReviewPeriodEnum.DAILY,
            ReviewPeriodEnum.WEEKLY,
            ReviewPeriodEnum.FORTNIGHTLY
          ),
          then: Joi.forbidden(),
          otherwise: Joi.number().required(),
        }),

        noDays: Joi.when(Joi.ref('/reviewPeriod'), {
          is: Joi.valid(
            ReviewPeriodEnum.DAILY,
            ReviewPeriodEnum.WEEKLY,
            ReviewPeriodEnum.FORTNIGHTLY
          ),
          then: Joi.forbidden(),
          otherwise: Joi.number().required(),
        }),
      })
    )
    .required(),
})

const listEmployeeGoalsSchema = Joi.object({
  page: Joi.number(),
  pageSize: Joi.number(),
  withDeleted: Joi.boolean(),
  status: Joi.string().valid(...Object.values(EmployeeGoalStatusEnum)),
  userMasterID: Joi.number(),
  goalMasterId: Joi.number(),
  companyMasterID: Joi.number(),
  sortByField: Joi.string(),
  sortByValue: Joi.string().valid('ASC', 'DESC', 'asc', 'desc'),
  exportData: Joi.string().valid('true', 'false'),
  exportFileType: Joi.string().valid('csv', 'xlsx'),
  search: Joi.string(),
})

module.exports = {
  bulkCreateEmployeeGoalSchema,
  listEmployeeGoalsSchema,
  updateEmployeeGoalSchema,
}

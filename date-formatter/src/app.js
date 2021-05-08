const moment = require('moment');
exports.lambdaHandler = async (event, context) => {
  try {
    const { date } = event;
    const formattedDate = moment(date).format('DD MMM YYYY');
    console.log(formattedDate);
  } catch (err) {
    console.log(err);
  }
};

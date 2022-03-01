const schedule = require('node-schedule');
const { Op } = require('sequelize');

const { Good, Auction, User, sequelize } = require('./models');

module.exports = async () => {
    try {
        const targets = await Good.findAll({
            where: { SoldId: null },
        });
        targets.forEach(async (target) => {
            const end = new Date(target.createdAt);
            end.setHours(end.getHours() + target.end);
            if ( new Date() > end){     // 낙찰에 실패한 상품
            const success = await Auction.findOne({
                where: { GoodId: target.id },
                order: [['bid', 'DESC']],
            });
                if (success){   //낙찰자가 있음
                    await Good.update({ SoldId: success.UserId }, { where: { id: target.id } });
                    await User.update({
                        money: sequelize.literal(`money - ${success.bid}`),
                    }, {
                        where: { id: success.UserId },
                    });
                } else {        //시간이 끝났는데도 낙찰자가 없음
                    await Good.update({ SoldId: target.ownerId }, { where: { id: target.id } });
                }
        } else {            // 아직 경매 진행중인 상품 
            schedule.scheduleJob(end, async () => {
                const success = await Auction.findOne({
                    where: { GoodId: target.id },
                    order: [['bid', 'DESC']],
                  });
                  await Good.update({ SoldId: success.UserId }, { where: { id: target.id } });
                  await User.update({
                    money: sequelize.literal(`money - ${success.bid}`),
                  }, {
                    where: { id: success.UserId },
                  });
            });
        }
        });
    } catch (error) {
        console.error(error);
    }
};
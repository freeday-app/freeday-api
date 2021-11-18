const { expect } = require('chai');

const Dialog = require('../../src/services/dialog.js');

const mock = {
    createDate: {
        intent: 'absence-creation',
        date: '2021-05-28T00:00:00Z'
    },
    createDates: {
        intent: 'absence-creation',
        startDate: '2021-05-27T00:00:00Z',
        endDate: '2021-05-28T00:00:00Z'
    },
    help: {
        intent: 'small-aide'
    },
    list: {
        intent: 'lister-absence'
    }
};

describe('[Services] Dialog', () => {
    describe('actionByIntent', () => {
        it('Should return the right action (create, date)', () => {
            const dialogAction = Dialog.actionByIntent(mock.createDate);
            expect(dialogAction.type).to.equal('modal');
            expect(dialogAction.date).to.equal(mock.createDate.date);
        });

        it('Should return the right action (create, startDate and endDate)', () => {
            const dialogAction = Dialog.actionByIntent(mock.createDates);
            expect(dialogAction.type).to.equal('modal');
            expect(dialogAction.startDate).to.equal(mock.createDates.startDate);
            expect(dialogAction.endDate).to.equal(mock.createDates.endDate);
        });

        it('Should return the right action (help)', () => {
            const dialogAction = Dialog.actionByIntent(mock.help);
            expect(dialogAction.type).to.equal('message');
            expect(dialogAction.path).to.equal('chat.help');
        });

        it('Should return the right action (list)', () => {
            const dialogAction = Dialog.actionByIntent(mock.list);
            expect(dialogAction.type).to.equal('list');
        });
    });
});

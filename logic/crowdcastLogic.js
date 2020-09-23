const events = [
  {
    id: 1,
    header: 'test header 1',
    author: 'Ivan R',
    description: 'test description 1',
    date: '01-03-2020',
  },
  {
    id: 2,
    header: 'test header 2',
    author: 'Alex M',
    description: 'test description 2',
    date: '01-03-2022',
  },
  {
    id: 3,
    header: 'test header 3',
    author: 'Ivan R',
    description: 'test description 3',
    date: '01-05-2020',
  },
  {
    id: 4,
    header: 'test header 4',
    author: 'Nicola L',
    description: 'test description 4',
    date: '01-03-2022',
  },
  {
    id: 5,
    header: 'test header 5',
    author: 'Ivan R',
    description: 'test description 5',
    date: '06-12-2020',
  },
];

const singleEvent = {
  id: 1,
  header: 'test header 1',
  author: 'Ivan R',
  description: 'test description 1',
  date: '01-03-2020',
};

module.exports = class CrowdcastLogic {
  static async getSingleItem(req, res) {
    res.send(singleEvent.toJSON());
  }

  static async getAllItems(req, res) {
    res.send(events.toJSON());
  }

  static async addItem(req, res) {
    res.sendStatus(200);
  }

  static async removeItem(req, res) {
    res.sendStatus(200);
  }

  static async editItem(req, res) {
    res.sendStatus(200);
  }
};

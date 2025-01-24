import { fail } from 'assert';
import { createCommonBinsAsync } from 'utils/createCommonBins';

describe('createCommonBins', () => {
  it('Has positive minimum and maximum where maximum is greater than minimum', (done) => {
    createCommonBinsAsync(0, 300)
      .then(({ commonBins }) => {
        expect(commonBins).toEqual([
          0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230,
          240, 250, 260, 270, 280, 290, 300,
        ]);
        done();
      })
      .catch(() => {
        fail('Should not reach here');
      });
  });
  it('Has negative minimum and positive maximum', (done) => {
    createCommonBinsAsync(-20, 280)
      .then(({ commonBins }) => {
        expect(commonBins).toEqual([
          -20, -10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210,
          220, 230, 240, 250, 260, 270, 280,
        ]);
        done();
      })
      .catch(() => {
        fail('Should not reach here');
      });
  });
  it('Has negative minimum and negative maximum where maximum is greater than minimum', (done) => {
    createCommonBinsAsync(-320, -20)
      .then(({ commonBins }) => {
        expect(commonBins).toEqual([
          -320, -310, -300, -290, -280, -270, -260, -250, -240, -230, -220, -210, -200, -190, -180, -170, -160, -150,
          -140, -130, -120, -110, -100, -90, -80, -70, -60, -50, -40, -30, -20,
        ]);
        done();
      })
      .catch(() => {
        fail('Should not reach here');
      });
  });
  it('Throws rejection when minimum and maximum values are the same', (done) => {
    createCommonBinsAsync(100, 100)
      .then(() => {
        fail('Failed to catch');
      })
      .catch(() => {
        done();
      });
  });
  it('Throws error when minimum is greater than maximum', (done) => {
    createCommonBinsAsync(290, 10)
      .then(() => {
        fail('Failed to catch');
      })
      .catch(() => {
        done();
      });
  });
  it('Throws error when minimum is undefined', (done) => {
    createCommonBinsAsync(undefined, 10)
      .then(() => {
        fail('Failed to catch');
      })
      .catch(() => {
        done();
      });
  });
  it('Throws error when maximum is undefined', (done) => {
    createCommonBinsAsync(0, undefined)
      .then(() => {
        fail('Failed to catch');
      })
      .catch(() => {
        done();
      });
  });

  it('Throws error when bin size is below bin size minimum threshold', (done) => {
    createCommonBinsAsync(1e-31, 1e-30)
      .then(() => {
        fail('Failed to catch');
      })
      .catch(() => {
        done();
      });
  });

  it('Throws error when bin size is negative and is below bin size minimum threshold', (done) => {
    createCommonBinsAsync(-1e-31, -1e-30)
      .then(() => {
        fail('Failed to catch');
      })
      .catch(() => {
        done();
      });
  });

  it('Throws error when bin size is above bin size maximum threshold', (done) => {
    createCommonBinsAsync(1e60, 1e61)
      .then(() => {
        fail('Failed to catch');
      })
      .catch(() => {
        done();
      });
  });

  it('Throws error when bin size is negative and above bin size maximum threshold', (done) => {
    createCommonBinsAsync(-1e60, -1e61)
      .then(() => {
        fail('Failed to catch');
      })
      .catch(() => {
        done();
      });
  });
});

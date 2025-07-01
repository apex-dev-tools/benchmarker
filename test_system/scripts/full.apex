benchmark('full');

describe('action 1');
{
  List<String> str = new List<String>();

  start();
  for(Integer i=0; i<10000; i++) {
    str.add('abc');
  }
  stop();
}

describe('action 2');
{
  List<String> str = new List<String>();

  start();
	for(Integer i=0; i<20000; i++) {
    str.add('abc');
  }
  stop();
}

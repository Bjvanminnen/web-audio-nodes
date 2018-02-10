# web-audio-nodes

```js
import { loadBuffer } from 'web-audio-utils';
import { SourceBuffer, Analyzer, Processor, Destination } from 'web-audio-nodes';

loadBuffer(path).then(buffer => {
  const fftSize = 2048;
  const onaudioprocess = () => { console.log('onaudioprocess'); };

  const graph = SourceBuffer({buffer, loop: true},
    Analyzer({smoothingTimeConstant: 0, fftSize},
      Processor({bufferSize: fftSize, onaudioprocess},
        Destination()
      ),
      Destination()
    )
  );
  graph.start();
});
```

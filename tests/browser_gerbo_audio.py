"""Focused rendering of the actual wheel graph: discrete bearing creaks and futile water squeaks."""
def check_gerbo_audio(page, check):
    rows=page.evaluate('''async()=>{
        const rows=[];
        for(const [name,speed,slip,wet,active] of [
            ['slow',8,0,0,true],['fast',32,0,0,true],['water',0,1.8,1,true],['silent',32,0,0,false]]){
            const rate=22050,seconds=8,ctx=new OfflineAudioContext(1,rate*seconds,rate);
            const wheel=GerboAudio.createWheel(ctx);let starts=0;
            const orig=ctx.createOscillator.bind(ctx);
            ctx.createOscillator=()=>{starts++;return orig()};
            // Offline suspend points advance AudioContext time while tick receives
            // the same rotation phase / speed used by the production renderer.
            const resume=ctx.resume.bind(ctx),pending=[];
            for(let i=0;i<seconds*20;i++){const t=i/20;
                const stamp=t;
                if(t===0)wheel.tick({roll:0,audioSpeed:speed,slip,wet,radius:24},active);
                else pending.push(ctx.suspend(stamp).then(()=>{
                    wheel.tick({roll:(speed/24+slip)*stamp,audioSpeed:speed,slip,wet,radius:24},active);
                    return resume();
                }));
            }
            const data=(await ctx.startRendering()).getChannelData(0);await Promise.all(pending);
            const windows=[];let peak=0,sum=0,nonfinite=0,centroid=0,weight=0;
            for(let start=0;start<data.length;start+=441){let ss=0;
                for(let i=start;i<Math.min(start+441,data.length);i++){
                    const v=data[i];peak=Math.max(peak,Math.abs(v));sum+=v*v;ss+=v*v;if(!Number.isFinite(v))nonfinite++;
                }windows.push(Math.sqrt(ss/441));
            }
            // Spectral high-frequency energy via first-difference energy is enough
            // to distinguish the wet chirps from the low voiced dry syllables.
            let derivative=0;for(let i=1;i<data.length;i++)derivative+=(data[i]-data[i-1])**2;
            rows.push({name,starts,peak,rms:Math.sqrt(sum/data.length),nonfinite,
                silentFraction:windows.filter(v=>v<.000001).length/windows.length,
                brightness:derivative/(sum||1),windows});wheel.dispose();
        }
        // A frozen roll cannot keep retriggering, even if stale speed remains nonzero.
        const ctx=new OfflineAudioContext(1,22050,22050),wheel=GerboAudio.createWheel(ctx);
        let voices=0;const osc=ctx.createOscillator.bind(ctx);ctx.createOscillator=()=>{voices++;return osc()};
        wheel.tick({roll:3,audioSpeed:30},true);
        const resume=ctx.resume.bind(ctx),p=ctx.suspend(.6).then(()=>{wheel.tick({roll:3,audioSpeed:30},true);return resume()});
        const data=(await ctx.startRendering()).getChannelData(0);await p;
        let tail=0;for(let i=11025;i<data.length;i++)tail=Math.max(tail,Math.abs(data[i]));
        rows.push({name:'frozen',voices,tail});
        return rows;
    }''')
    slow,fast,wet,silent,frozen=rows
    check('Faster rolling produces more separate syllables',fast['starts']>slow['starts']>=2)
    check('Dry bearing creaks have genuinely silent gaps instead of a continuous whine',
          slow['silentFraction']>.65 and fast['silentFraction']>.5)
    check('Wet wheelspin is quieter and spectrally higher than dry rolling',
          wet['rms']<fast['rms'] and wet['brightness']>fast['brightness']*1.2)
    check('Squeaks stay finite and leave digital headroom',all(r['nonfinite']==0 and .0001<r['peak']<.15 for r in rows[:3]))
    check('Inactive wheel output is silent',silent['peak']==0 and silent['starts']==0)
    check('Frozen phase cannot sustain or retrigger a whine',frozen['voices']==1 and frozen['tail']<1e-6)
    return rows

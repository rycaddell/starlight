#!/usr/bin/env node
/**
 * Mirror Generation Content Filter Test Script
 *
 * Tests mirror generation with different journal sets to identify content filter triggers
 *
 * Usage:
 *   node scripts/test-mirror-generation.js
 *
 * Requirements:
 *   - OPENAI_API_KEY environment variable set
 *   - Journal data in ./test-journals directory (or uses test data)
 */

const fs = require('fs');
const path = require('path');

// ⚠️ WARNING: Do not commit your API key to git!
// For testing convenience, you can paste your key here temporarily:
const HARDCODED_API_KEY = ''; // Paste your OpenAI key here for testing

const OPENAI_API_KEY = HARDCODED_API_KEY || process.env.OPENAI_API_KEY;
const OUTPUT_DIR = path.join(__dirname, 'test-results');
const NUM_SETS = 5;
const TRIALS_PER_SET = 3;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Mirror prompt generation (copied from edge function)
function generateMirrorPrompt(journalEntries) {
  const journalText = journalEntries.map((entry, index) => {
    const date = new Date(entry.created_at).toLocaleDateString();
    if (entry.prompt_text) {
      return `Entry ${index + 1} (${date}): In response to '${entry.prompt_text}', the user wrote: ${entry.content}`;
    }
    return `Entry ${index + 1} (${date}): ${entry.content}`;
  }).join('\n\n');

  return `You are a wise, compassionate spiritual director analyzing someone's journal entries to provide encouraging spiritual formation insights.

JOURNAL ENTRIES TO ANALYZE:
${journalText}

Please generate a "Mirror" - a 3-screen spiritual reflection in JSON format with exactly this structure:

{
  "screen1_themes": {
    "title": "Themes",
    "subtitle": "Patterns across your journals",
    "themes": [
      {
        "name": "Theme Name",
        "description": "Brief description of this theme",
        "frequency": "Present in journals from March 15, March 22, and April 3"
      }
    ]
  },
  "screen2_biblical": {
    "title": "Biblical Mirror",
    "subtitle": "Pattern matches in Scripture",
    "parallel_story": {
      "character": "Biblical character name",
      "story": "Brief story summary that parallels their experience",
      "connection": "How this connects to their journey"
    },
    "encouraging_verse": {
      "reference": "Bible verse reference",
      "text": "Verse text",
      "application": "How this verse speaks to their situation"
    }
    "invitation_to_growth": {
       "reference": "Bible verse reference",
       "text": "Verse text",
       "invitation": "Gentle invitation for deeper reflection"
     }
  },
  "screen3_observations": {
    "title": "Observations",
    "subtitle": "Patterns in your framing",
    "self_perception": {
      "observation": "How they tend to view themselves spiritually, with specific journal date references"
    },
    "god_perception": {
      "observation": "How they tend to relate to or view God, with specific journal date references"
    },
    "others_perception": {
      "observation": "How they tend to view or relate to others, with specific journal date references"
    },
    "blind_spots": {
      "observation": "Pattern they may not be aware of that could benefit from attention, with journal date references"
    }
  }
}

IMPORTANT REQUIREMENTS:
- For screen1_themes: Generate exactly 4 themes maximum, no more
- For theme frequency references: Use actual journal dates (e.g., "Present in journals from March 15, March 22, and April 3") instead of entry numbers
- Do NOT include an "insight" field in screen1_themes
- For screen3_observations: Focus only on observations without recommendations. Each section should contain ONLY the observation field with specific journal date references. Do not include growth edges, invitations, challenges, or growth opportunities - just neutral observations of patterns. If no clear evidence exists in the journals for a particular area (self, God, others, blind spots), omit that section entirely rather than making generic observations.
- Reference specific dates from the journal entries provided above
- CRITICAL: Ensure all text in JSON strings is properly formatted. Do not use unescaped quotes or newline characters within strings. Keep text on single lines.

TONE GUIDELINES:
- Warm, encouraging, and non-judgmental
- Acknowledge struggles without being dismissive
- Find genuine hope and growth even in difficult seasons
- Use accessible, modern language while remaining spiritually grounded
- Sound like someone who has chosen their words carefully
- Maintain warmth and patience, but with measured, efficient phrasing - no filler
- Be specific to their actual journal content, not generic
- Balance affirmation with gentle invitations for growth

Generate only the JSON response with no additional text.`;
}

// Call OpenAI API
async function generateMirror(journalEntries, testName, trialNum) {
  console.log(`\n🎯 Testing: ${testName} - Trial ${trialNum}`);

  const prompt = generateMirrorPrompt(journalEntries);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 10000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `OpenAI API error: ${response.status} - ${errorText}`,
        testName,
        trialNum,
      };
    }

    const data = await response.json();
    const finishReason = data.choices[0].finish_reason;
    const content = data.choices[0].message.content;
    const contentFilterTriggered = finishReason === 'content_filter';

    console.log(`  Finish reason: ${finishReason}`);
    console.log(`  Content filter: ${contentFilterTriggered ? '❌ YES' : '✅ NO'}`);
    console.log(`  Tokens used: ${data.usage?.total_tokens || 'unknown'}`);

    return {
      success: !contentFilterTriggered,
      contentFilterTriggered,
      finishReason,
      content,
      usage: data.usage,
      testName,
      trialNum,
      fullResponse: data,
    };
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      testName,
      trialNum,
    };
  }
}

// Test journal data sets
const journalSets = [
  {
    name: 'Adam',
    journals: [
      { content: "I just finished a Become New video and it was really about the the author that was sharing what's called the spirit or the book was called Spirit of Politics and the grounding verse was really in Philippians about our citizenship being in heaven and that we take on having been bought by Jesus we take on his values and become citizens of heaven in his perspective. I think the other piece that stuck out was just that like our news cycle and our politics are meant to evoke reactions and constantly triggering our defensive response and helping us to retreat to tribal safety and and he says that like so much of fundraising is like give us money to help us pass legislation or give us money to for us to professionally hate the other people and and I thought that one of the best parts in it was like how Jesus said you know for those of you that have committed or I don't I don't just condemn murder it's the spirit behind the murder that is the root of the issue and so what I'm taking away from that is really like what is the spirit behind the responses that are being made and combining that with you know what is Jesus's way what is Jesus leading and his way is the cross his way was submission to God and it was sacrifice and it was suffering and how does that translate into you like our modern day and how I should respond to things I think there's sort of an introspection of just like God help me to see what is moving inside my heart and and God can you help me to purify that so that the outflow of my heart my words and my actions is honoring and makes my citizenship clear just in the way that like you know a different language or an accent would be clear I want my heart and the expression of my heart my actions to be evident in Jesus honoring and for that to be my art so that's my thought for this morning", created_at: "2025-07-01T09:30:00Z" },
      { content: "This morning I was reading in Ephesians about having one foot in the worldly thinking that non-Christians follow. And the charge of not having a hint of greed, selfish ambition, or sexual immorality … I don’t think I’ve removed all of those places and replaced them with love for and trust in the Lord. I daily feel insecurity about not cutting it in my field and never making anything worthwhile or admirable. Getting to store this in an app I’ve made is pretty great. But the fact that I’m still torn up about worldly progress means that I’m not leaning hard enough into the good that God has for me", created_at: "2025-07-03T12:15:00Z" },
      { content: "I There's this thing about Palm Desert, there's like a soccer park near the resort, which is really really cool Sort of like a dream For me and my friends like when we were in college just have like a great feel for playing soccer after school We've got just all these open soccer fields and nets and perfect grass to play on and just it's it was dreamy. So Hudson's sort of been like I want to do that every single day So we went out and we started playing Some soccer and there was some young guys that were playing at a high level and they were just sort of kicking around and so I Said Hudson like how would you feel about going over and talking to them and seeing if we could play with them? and He got really emotional about he got really scared And he was able to verbalize that he was scared But it was harder for him to communicate why he was feeling scared So he took some time away and then I said, okay. Well, how about if I do it? and so I Ran over and I asked if they were doing a serious game or serious practice It would be okay if he and I joined for a few minutes And they said sure and they were nice enough One of them like sort of ran off and did his own thing because I don't think that he Wanted to hang out with us or or whatnot, but the other two were Pretty welcoming just awkward But I wanted Hudson to get a model of like what it would be like to put yourself out there and be in a potentially awkward situation and with your confidence try to make it less awkward and I Want him to be able to associate with older guys and have older guys that are younger and strong Into it for him to feel welcomed into that group and I think one of the things that I was realizing or feeling like while I was playing soccer with them is that you know, these young guys are ripping the soccer ball and They are kicking it in a way that I have never been able to kick it and Have like a certain amount of strength that's like high schoolers That is like wow, that's impressive, you know, and it brought me back to Westmont days where I felt like insecure around the guys that I was playing with at Westmont that had that ability and that skill and that strength and So I found insecurity creeping in I'm just like, you know what maybe I can't Make it in an adult league in an adult men's league. Like I don't I'm not strong enough I'm not like aggressive or dynamic or violent enough and So I started to feel that insecurity creeping and that and Then I you know, I'm looking at LinkedIn And I am seeing like a post from a former CEO at Sondermine and Wondering, you know if I launch the Oxford lap app and it does well enough Like can I get a meeting with Mark and will he respect me? You know, those are thoughts. I'm thinking and So I feel like there's just so much that circles around the issue of I Just really want respect from other men I want to be respected as a man capable of Doing hard things stepping into violent athletic strong spaces dynamic spaces and succeeding I don't like I'm a gentle Person, I'm a reflective and kind and thoughtful person But I I don't like feeling like I'm shrinking in these like quote-unquote manly spaces Where you know aggressive aggression and strength like soccer or football or whatnot? Or even you know business where those sorts of things take place I don't like feeling insecure Feeling insecure And I think in a lot of senses it's like In my head, I know that it's really for those that make it for those that step in and It takes courage to step into the arena and that's not like that Theodore Roosevelt quote And I'm trying to model the courage for myself and for Hudson But it was just one of those things it's like You know what? Maybe the soccer goal that I've been talking about the last few days of playing on an older men's team Maybe that's not realistic I think I owe it to myself to try but But I just wanted to acknowledge this doubt or this insecurity that I'm feeling", created_at: "2025-07-05T18:45:00Z" },
      { content: "I have felt convicted about how much we spend or maybe how we spend. What do we need? How can the way we spend be a witness to the others and be counter cultural? I want the boys to have amazing and wonderful experiences but I want to help them feel content in all circumstances. I don’t want to feel like we have to go on trips in order to feel like we’re living a good life. But I think this applies to our other spending too. We’re not really saving money the way that we want and I would love to give more.", created_at: "2025-07-07T20:30:00Z" },
      { content: "I heard yesterday that the job I have had is being taken away. I may have another job at the company but my boss seemed noncommittal. I felt pretty low yesterday and this morning. I have known that Clubhouse wasn’t a forever job but I was really hoping to get skills and connections that would help me launch this app alongside paycheck stability. The loss of stability and having professional change forced on me is the hardest part. I do trust God here. He has provided, he will take care of us and I feel better equipped to handle this challenge. But it is a disappointment in the script!", created_at: "2025-07-09T17:20:00Z" },
      { content: "At small group we talked about how to be alongside people who are suffering. In a lot of respects I feel like I want a break from the topic. It’s so core to the human experience that it’s unavoidable but I want to choose how and when I engage that space. Because a lot of the time I don’t get to choose that. I might find out I’m losing my job tomorrow. I am trusting the Lord in it and if I get let go, then I will turn into a job-hunting, oxbow building, chainsaw running, family serving, fitness champ. I will hit it full speed. But if I stay, I want to grow and make a difference. I’m digressing. What I have loved about friendship with Mike is that he knows what it’s like to suffer, he gets it, he cares but he’s not going to get dragged down by me sharing what’s going on with me. And that frees me up to not worry about laying down hard sad stuff. We sort of have an understanding that we may really be in it or maybe aren’t but we are ok being in different places", created_at: "2025-07-11T07:00:00Z" },
      { content: "In prayer with Danielle about my job tomorrow, I loved how she prayed that “our preference is to stay at Clubhouse but we trust you”. I felt like what the Lord was saying was that you take your presence with me wherever you go. He has made our hearts his home. His favor is on us, even if this job outcome isn’t favorable to what we want in the short term. He will take care of us. I love resting in this and feel so grateful to be seen and encouraged by the Lord", created_at: "2025-07-13T19:15:00Z" },
      { content: "Verse 4 today that resonated with me, 2 Corinthians 4 16 17 18. Therefore we do not lose heart, though outwardly we are wasting away, yet inwardly we are being renewed day by day. For our light and momentary troubles are achieving for us an eternal glory that far outweighs them all. So we fix our eyes not on what is seen, but what is unseen. For what is seen is temporary, but what is unseen is eternal, connects with me, the author of Hebrews about fixing our eyes on Jesus, the author and perfecter of our faith. And I feel like I get tripped up so easily with light and momentary troubles that Paul is talking about in 2 Corinthians. And so the word for today is to pick my head up and to recognize that these challenges are work towards unseen, but also to look beyond the circumstance and what God thinks and what His glory looks like. That's it.", created_at: "2025-07-15T14:30:00Z" },
      { content: "Group this morning, you know, Joe led and it was on Mark 11 and the Faith of a Mustard Seed and this was something that I had led out of basically when he was on parental leave and so it was it was really cool to sort of pause with the group and just say like the Lord is like each week different people are talking about themes of suffering or the themes of faith and trust and how do you increase your faith and I think I think that the aha moments for me are that is that faith is a practiced behavior rather than something that you have or you don't have I think that like faith is an action you know Hebrews 11 is also talking about faith is having confidence in what you can't see and later in Hebrews it talks about like Jesus being setting our eyes on Jesus the author and perfecter of our faith who for the joy set before him endured the cross and the shame and I think what was so clear about that or what like what became clear to me during group today was that Jesus had all of the faith and if we're to look if we are to look to Jesus as an example to fix our eyes on Jesus it's also to see his submission to basically say to God like God this is what I want but your will be done and I trust God that you are going to say I'm I'm I I'm delegating to you assigning to you the power to choose what is the right thing to do and I think what I'm part of Joe's question was like can I trust God if he says no to the things that I feel like are really important to me and I think faith is saying God I really want this I see you see that I really want this I want that to be healed but I assign to you and have faith that you are going to work out what is best for your glory and for for all of us only you can make this decision and I think that that's what more of what faith is is is I think like there's part of me that has felt like that is too passive where faith is like a you know I'm supposed to go out and use my faith to heal people and do different things but there really has to be more deference or like more active searching of like God what do you want to do what do you want in this situation here so do I want God how how can I can I trust you that you're going to make the right decision as opposed to being indifferent and praying praying passively like being disappointed that things aren't happening I think I think Zach made another good example of just like remembering is a critical element to faith remembering that God has been faithful I think that's a discipline that I could stand to grow in but that felt really I felt really important for us to center around you know what is God trying to teach us about suffering and about faith", created_at: "2025-07-17T21:45:00Z" },
      { content: "I went for a walk earlier today and was praying for Tommy and Olivia and I had a hard time sorting out like with God how much was like indifference just because I'm not in it but I know how hard this is for my friend and so I was sort of like who I do care about but it's just like what what should my take on what should happen matter like I want what God wants I want what Tommy and Olivia wants I want God to win and for healing and restoration and all those things to take place but like I'm not in it and so it was a weird space to pray differently because I am trying to do more deference to God and say like God you know what's best here's what I think like here's what I see these people are in pain and I care about them but I don't I don't know what's best and I think that that's the right place to be and I think that what I'm supposed to be involved in is how do I what's my role in loving them and supporting them and being a listener to what God's doing being curious I think that's my role separately I watched like a video of mr. Rogers neighborhood and I feel like that show in a lot of respects just kind of creepy different style different intention but in a lot of senses it it feels like it's sort of a dog trainer but for humans like I felt like he was speaking into authentically what humans needed to hear and that humans adults are just grown-up kids and they want to be seen as valuable not for their usefulness but just based on who they were and I think that that's what got me so emotional was watching him sing I like you the way that you are or as you are to you know to a homosexual man that he worked with and to a boy with a disability that was bound to a wheelchair he just was imbuing and not just saying that they're valuable but believing it and reinforcing it and they felt it and I want to be more like that I want to imbue value to other people without what they without expecting and prioritizing them based on what they can do for me so I was very emotional just because I felt like it was so powerful and countercultural those are my two things for today", created_at: "2025-07-19T16:00:00Z" }
    ]
  },
  {
    name: 'Eve',
    journals: [
      { content: "Tension at work is getting worse. Other salespeople avoiding me because I won't play their games. Eating lunch alone most days. Jeremiah was lonely too. Sometimes following God means walking a narrow path.", created_at: "2025-07-01T06:30:00Z" },
      { content: "This morning I was reading in Ephesians about having one foot in the worldly thinking that non-Christians follow. And the charge of not having a hint of greed, selfish ambition, or sexual immorality … I don’t think I’ve removed all of those places and replaced them with love for and trust in the Lord. I daily feel insecurity about not cutting it in my field and never making anything worthwhile or admirable. Getting to store this in an app I’ve made is pretty great. But the fact that I’m still torn up about worldly progress means that I’m not leaning hard enough into the good that God has for me", created_at: "2025-07-03T10:15:00Z" },
      { content: "This is my evening journal. I just had a chance to be at church today, which was really encouraging for me. We've been in a series talking about koinonia, this idea of community. Just this idea that formation happens in community. And that, you know, we don't really grow in isolation. So he was talking about the idea that we share a faith that binds us together, that is common in a shared faith. And that through that, God has revealed himself to his people and calls us to embrace that and share that together. He entrusts what he's revealed to his people and calls us to share that to the world. So we have this common faith that's revealed, it's received, it's reflected upon, it's put into practice. But some of the challenges of what the church has been in the years, in my own experience, having gone through church hurt, it's lead to a lot of deconstruction. And this can be referred to as the dark night of the soul, or trial of faith, or desert. But his challenge and calling is not that deconstruction isn't seen as a threat to a faith, but feels like an opportunity of deeper engagement in God. And that we should embrace this and encourage it within our community, that we wrestle through it, not just within ourselves, but within our community. He said one of the challenging things is that we often, if we misconstrue what is foundational during deconstruction, it can be confusing and really damaging. And so it was really helpful to hear this example that he talked about, where basically it's kind of like a building has a foundation, it has a cornerstone, and that through our life experience, whether it's relationships with God, the church, trials, hardship, whatever, just living life, our perspective, the way we're building upon our life can become slightly skewed, and then all of a sudden we can feel this challenge. And often we just want to identify it as the foundation, go, you know, God, I'm frustrated about all these things, and I'm just going to cast that aside. And he's like, no, often the foundation is solid, but the way that we're building within that foundation is a challenge. And so we talked about, you know, within what's being built upon the foundation, that it's like a home and you're remodeling, and often that can happen as seasons change in life. Things that were helpful earlier in life are no longer helpful, and things that were separate before in life can no longer be separate. And he talked about, like, knocking out walls inside of a home, and how that just joins two spaces, takes two things that seemed like they were separate and brings them together. And that through all that, we can see that knocking down the walls, the idea of holding two things together that I didn't think belonged together, and see how they naturally belong together all along. So it's just this opportunity to hold two things. For me, that's the idea of trusting God, not just that He's good, but that He can care for me, while at the same time feeling this extreme pain in my relationship with Olivia, feeling like my marriage is broken, feeling like God is good, I can trust Him and He'll care for me. Those two things I want to make separate, and yet they're happening together in my life right now. And so I just feel challenged by that. Yeah. I think another thing, just to remember that Christ is at the center of my experience and not myself. I often want to put myself at the center, but when I do that, all this pain becomes about me, becomes about what I want, my desires. Instead of putting Christ at the middle and walking through it in a way in which He's glorified and He's exalted in a way in which He's glorified and He's exalted and He is the center of my heart, not my own selfishness. So these are just some thoughts I have for today.", created_at: "2025-07-05T19:45:00Z" },
      { content: "Verse 4 today that resonated with me, 2 Corinthians 4 16 17 18. Therefore we do not lose heart, though outwardly we are wasting away, yet inwardly we are being renewed day by day. For our light and momentary troubles are achieving for us an eternal glory that far outweighs them all. So we fix our eyes not on what is seen, but what is unseen. For what is seen is temporary, but what is unseen is eternal, connects with me, the author of Hebrews about fixing our eyes on Jesus, the author and perfecter of our faith. And I feel like I get tripped up so easily with light and momentary troubles that Paul is talking about in 2 Corinthians. And so the word for today is to pick my head up and to recognize that these challenges are work towards unseen, but also to look beyond the circumstance and what God thinks and what His glory looks like. That's it.", created_at: "2025-07-07T07:30:00Z" },
      { content: "I just got back from men's group from barbecue and reconnect and I'm feeling really excited about being back with those guys. I think I've missed those relationships. We had a worship time and the songs were very much about like God's goodness and his faithfulness and I'm coming through and and I think it was a little bit hard to engage. I think I've just been feeling a lot of the weight of Beth's recovery and also a lot of stress with my job that I need to figure out how to manage well. That's not a God thing but I just don't feel like I'm in a super healthy place and there have been so many wonderful and good things that God has given to me and continues to give me. I live in a beautiful house. I've got healthy kids and an amazing partner and I'm healthy and like there's so many things I can point to that are good. I just I think I feel off balance spiritually and a little bit distant from God. Not that he is any further away but just I think my excitement about engaging I think ironically you know I built this app to observe what is going on in my own heart and in my mind and and I feel like I'm still going through it. I feel like I'm I'm still going through some of the same.", created_at: "2025-07-09T14:20:00Z" },
      { content: "In prayer with Danielle about my job tomorrow, I loved how she prayed that “our preference is to stay at Clubhouse but we trust you”. I felt like what the Lord was saying was that you take your presence with me wherever you go. He has made our hearts his home. His favor is on us, even if this job outcome isn’t favorable to what we want in the short term. He will take care of us. I love resting in this and feel so grateful to be seen and encouraged by the Lord", created_at: "2025-07-11T11:00:00Z" },
      { content: "I had a good worship time today where I felt like the Lord enabled me to focus in on him. It felt special to have that time. I feel strongly that he wants us to have a worship night, but that produced a wave of grief / sadness about Beth not being able to join. And me asking God to restore her. I will keep praying and asking!", created_at: "2025-07-13T17:15:00Z" },
      { content: "This is my morning journal, just had a chance to be at church and it was really good to be in a space of worship. I feel challenged by the past mirror, just reflecting a challenge to be in spaces that bring me back to His presence. So today he was just talking about characteristics of what the church is, what we're called to, and how today is Christ the King Sunday, a reminder that we live in brokenness, suffering, and pain, and yet Christ will redeem it, and He will be victorious, and it was a good challenge not to have it fully understood and laid out, but to be in a space in which I can be reminded that He will reign through this, that He will care for me in this, that He'll be present in it with me. Those are all hard things for me to really grasp right now. There were different characteristics he talked about. One of the things he talked about is that the church would be hospitable and healing. I think that was huge. It was a good reminder that us as individuals and us as a community would be marked by healing, not just in our own life, but that people would experience that as they experience us, and that that would bring who Christ is into the relationship. And so it was just a challenge. Part of that he talked about is just curiosity, courageous curiosity, in that curiosity isn't about knowledge and info gathering, but about a chance for intimacy and relationship. So curiosity for me in relation to what He's got doing in this time, not necessarily why the separation, but Lord, what do you desire to surface in me? And then curiosity with Olivia, why, truly trying to understand her and value her and her experience, and then just being generous and hospitable toward her in that. So these are the things I'm weighing this morning.", created_at: "2025-07-15T20:30:00Z" },
      { content: "From the expanse of the universe to the smallest electron, God is sovereign. But he is not consumed with the vastness of his creation. He cares about the details of our lives. Trusting him is not always easy nor preferred but he is still no less sovereign.", created_at: "2025-07-17T22:45:00Z" },
      { content: "I don't feel alone I am doing okay I would just really like to finish this feature and then move on to other things", created_at: "2025-07-19T21:00:00Z" }
    ]
  },
  {
    name: 'David',
    journals: [
      { content: "Rootedness in the Spirit leads to fruits of the spirit as an overflow response. I can take the action of putting on these fruits but only by the power of the spirit is that sustainable and effective. There is an element of my own practice and discipline required but I cannot rely on my own power to sustain it. It’s only by life in the spirit and not the flesh. Paul’s prayer to the church in Colossians has similar themes to his prayer for the church in Ephesians. His power at work within me is the goal for knowing him and experiencing his love.", created_at: "2025-07-01T22:30:00Z" },
      { content: "At men's group this morning, I shared testimony of just what's going on, life and work, and I think the important thing for me is really talking about, quote unquote, holy indifference. Like, I have strong, I really want certain things, but I am also learning to trust God and say, like, I cannot make the decision for all of us. It's God's to decide, it's mine to work in, to take steps in. I'm not removing myself from the process, I still care about the outcome. But ultimately, I trust God that He is making the best decision for us when He chooses to heal or not heal, to bring about an opportunity or not an opportunity in all these different circumstances. When Tad prayed for me, I think what stuck out in his prayer was just praying for stamina and endurance, and I think that is a real thing that I am looking to prepare for. I think the other parts, so the discussion was in Job, and I think that the two biggest points were really about, like, not, like, protecting the things that have been anchors for you or meaning, like, this is hard to articulate. The things that brought me to health, the things that brought me to the Lord that have made this chapter so healthy, sleep and fasting and worship and being in the Word and submitting to the Lord, wrestling with Him, like, these are all the things that have brought me health in healthy times. And so, when heading a trial, sort of like what Job is going through, defending my dependencies, the things that, so the circumstances don't, aren't as changing or not as impactful. And then, the other one was, like, likening God's rebuke of Job to a parent stepping in and saying, okay, now it's my turn to be big for you, like Keegan said. Keegan says sometimes, like, his kids, when they're dysregulated, he has to step in and change the circumstances and say, okay, I'm stepping in now, I'm in control. And the middle of Job's sort of suffering was God stepping in and correcting him in an albeit intense way to say, okay, I'm going to be big now, and ultimately, that's good for the kids to see that take place. So, I think, like, maybe the bigger point is that I need to defend my sleep and defend my time with the Lord and in prayer because it's my foundation. Alberto was referencing, like, Jesus when he said, like, my food is doing the will of my Father. I need to protect my food source. And then the other part is that, like, there are going to be spaces in my suffering and in my questioning where God is going to show up big, and that's either going to be in correction or encouragement or whatever he needs or whatever he wants to do, which is right for me, and I trust him with that.", created_at: "2025-07-03T08:15:00Z" },
      { content: "God feels close now. I'm having fun. It feels like I'm exploring. Now I'm going to hit stop. Watch.", created_at: "2025-07-05T13:45:00Z" },
      { content: "I had a great day either friends and family. We talked about the old family home and the memories we shared there", created_at: "2025-07-07T19:30:00Z" },
      { content: "Tried to pray but ended up just sitting in silence. Maybe honesty with God is better than empty words. I'm confused, angry, and lost.", created_at: "2025-07-09T23:20:00Z" },
      { content: "Group this morning, you know, Joe led and it was on Mark 11 and the Faith of a Mustard Seed and this was something that I had led out of basically when he was on parental leave and so it was it was really cool to sort of pause with the group and just say like the Lord is like each week different people are talking about themes of suffering or the themes of faith and trust and how do you increase your faith and I think I think that the aha moments for me are that is that faith is a practiced behavior rather than something that you have or you don't have I think that like faith is an action you know Hebrews 11 is also talking about faith is having confidence in what you can't see and later in Hebrews it talks about like Jesus being setting our eyes on Jesus the author and perfecter of our faith who for the joy set before him endured the cross and the shame and I think what was so clear about that or what like what became clear to me during group today was that Jesus had all of the faith and if we're to look if we are to look to Jesus as an example to fix our eyes on Jesus it's also to see his submission to basically say to God like God this is what I want but your will be done and I trust God that you are going to say I'm I'm I I'm delegating to you assigning to you the power to choose what is the right thing to do and I think what I'm part of Joe's question was like can I trust God if he says no to the things that I feel like are really important to me and I think faith is saying God I really want this I see you see that I really want this I want that to be healed but I assign to you and have faith that you are going to work out what is best for your glory and for for all of us only you can make this decision and I think that that's what more of what faith is is is I think like there's part of me that has felt like that is too passive where faith is like a you know I'm supposed to go out and use my faith to heal people and do different things but there really has to be more deference or like more active searching of like God what do you want to do what do you want in this situation here so do I want God how how can I can I trust you that you're going to make the right decision as opposed to being indifferent and praying praying passively like being disappointed that things aren't happening I think I think Zach made another good example of just like remembering is a critical element to faith remembering that God has been faithful I think that's a discipline that I could stand to grow in but that felt really I felt really important for us to center around you know what is God trying to teach us about suffering and about faith", created_at: "2025-07-11T07:00:00Z" },
      { content: "Talked with my small group about my doubts. They listened without judgment. Maybe community is where I find God when personal prayer feels dead.", created_at: "2025-07-13T21:15:00Z" },
      { content: "Things are going okay for what they are. Laura and I talked about this dog that I got. She's not happy about it, which is normal. Everything that I do, she's not happy with. She's always got something to say that I've done something wrong. I knew that was going to come. I just get so tired of being wrong and questioned. There's not much motivation. I know the right thing to do is to press in. But I don't know how to press in right now. So I got me a dog. I got me a tattoo. Right or wrong, I don't know. I'll know when my last breath comes.", created_at: "2025-07-15T18:30:00Z" },
      { content: "Watched a documentary on suffering. The problem of evil is real and complex. My faith feels fragile, but I'm not ready to let go completely.", created_at: "2025-07-17T20:45:00Z" },
      { content: "I had a good conversation with Tad. He came over. I got to hear more of his story. And I think he feels really disrespected and hurt in his relationship with his wife. And I feel like I was reflecting on him that I need to be more curious about what my role is in helping other people be more like Jesus. And it may not have a role. I may just be a listening ear. But I think that's been a frequent question is, God, what is my role? Help me to see what you, who you're growing them into being, what you're trying to speak into them. So that was a question I was asking Tad about what is his role in being curious about what is going on with his wife and God. What is God trying to teach her? What is his role in that? But also, you know, just Tad's not my closest friend, but it was great to get to know him better. And so, God, what's my role in supporting him? I think as he, he prayed for me and really enjoyed the app concept, but I, he was praying the word surrender. And I don't know, I don't know what that means for me. I need to think about that and reflect on that. Whether surrender is simply trusting and letting, letting the Lord do the work. I think that there's also, I was reminiscent of like the prophecy that I received in Mexico, just about the joy of the Lord being my strength. And that sort of started with a posture of surrender. And that prophecy is always like mixed in some ways because I, you know, the pastor called me deep waters, which is my last name. But then that I was called to lead for a special purpose and I've never known what that has meant. And I, there is a part of me, this ambitious part of me that wants that to be something so special and so valuable. But for a lot of the reasons that I don't think are important or the things that I'm trying to shed myself from, that I don't want to achieve for validation, to feel valuable, I, to feel respected. Those are, that's achieving to escape insecurity. And it's, it's also possible that that prophecy was just about leading my family or being a leader amongst my friends like Tad or other people like speaking into their lives or I don't know. But I just want to be open to the Lord and I want His joy to be my strength. But it's, it's difficult when I like am spending several hours at work, working on projects and feeling insecure and fearful and anxious. And then I have a friend over and we talk about life and we pray together. I give counsel and I talk about like the app that I'm building, how, how excited I am about it. And I just, I feel so confident. I feel so in what I'm supposed to be doing in those moments. And I feel less so when I'm at my paying job at Clubhouse and that, that's a little bit sad. But I think that that's the time that I'm in right now. I have choice and I have agency in that. But that's, that's the thing. But that's it for now.", created_at: "2025-07-19T22:00:00Z" }
    ]
  },
  {
    name: 'Rick',
    journals: [
      {
        content: "Three years since my brother's suicide. The anniversary always hits hard. I'm angry at God for not intervening, angry at myself for missing the signs. My therapist says grief isn't linear, but this darkness feels endless. Where were You, God?",
        created_at: "2025-06-01T22:30:00Z"
      },
      {
        content: "Sponsor called today because I didn't show up to the meeting. Ten months sober and I almost threw it away yesterday. Stood in the liquor store parking lot for twenty minutes. The pain of living without numbing feels unbearable sometimes. God, I need Your strength because mine isn't enough.",
        created_at: "2025-06-03T19:15:00Z"
      },
      {
        content: "Flashback during worship service today - suddenly back in my childhood bedroom with my father's rage filling the house. Had to leave before I had a panic attack. The worship leader looked concerned but I couldn't explain. Trauma lives in my body and triggers without warning. Will I ever feel safe in Your presence, God?",
        created_at: "2025-06-05T14:45:00Z"
      },
      {
        content: "My daughter asked why I have scars on my arms. The cutting stopped five years ago but the evidence remains. How do I explain to her that mommy used to hurt herself to feel something other than emotional pain? I wanted to die then. Today I want to live, but explaining my past feels impossible.",
        created_at: "2025-06-07T21:30:00Z"
      },
      {
        content: "Read Job's story. He lost everything - children, health, wealth. His wife told him to curse God and die. I understand her desperation. After our miscarriage last month, part of me wanted to rage against heaven too. The silence from God during suffering is deafening.",
        created_at: "2025-06-09T07:00:00Z"
      },
      {
        content: "Intrusive thoughts about harming myself came back today. Called the crisis line like my therapist taught me. They passed eventually, but the violence of my own mind against itself is terrifying. Depression lies, I know this intellectually. But emotionally? I'm drowning. God feels absent.",
        created_at: "2025-06-11T23:45:00Z"
      },
      {
        content: "Support group for abuse survivors tonight. Hearing other women's stories of domestic violence makes me realize I'm not alone, but also makes me wonder how God allows such evil. My ex-husband nearly killed me. The bruises healed but my soul still feels battered. Where is justice?",
        created_at: "2025-06-13T20:15:00Z"
      },
      {
        content: "Medication adjustment week three. The psychiatrist says finding the right antidepressant is trial and error. Trial and error while I'm barely keeping my head above water. Why did God make brains that can turn against themselves? Mental illness feels like a cruel design flaw.",
        created_at: "2025-06-15T10:30:00Z"
      },
      {
        content: "Pastor preached on trusting God's plan. Easy to say when your child isn't dying of cancer. My son's prognosis is grim and I'm supposed to have faith? I want to believe in divine healing but I also need to prepare for possible death. This liminal space of hope and grief is torture.",
        created_at: "2025-06-17T18:00:00Z"
      },
      {
        content: "Told my therapist I sometimes wish I could just stop existing - not die violently, just cease. She asked if I have a plan. I don't. I'm not suicidal, just exhausted by the weight of being alive with this much pain. There's a difference between wanting to die and wanting the suffering to end. God, I'm so tired.",
        created_at: "2025-06-19T22:00:00Z"
      }
    ]
  },
  {
    name: 'Ellen',
    journals: [
      { content: "Starting a new Bible reading plan today. Excited to dig deeper into Scripture and know God more intimately.", created_at: "2025-07-01T05:30:00Z" },
      { content: "Noticed a pattern in my prayers - always asking for things, never just enjoying God's presence. Want to learn contemplative prayer.", created_at: "2025-07-03T06:15:00Z" },
      { content: "Read Richard Foster's 'Celebration of Discipline.' Convicted about my shallow spiritual life. Hungry for transformation.", created_at: "2025-07-05T22:45:00Z" },
      { content: "Practiced lectio divina with Psalm 46. The phrase 'Be still and know that I am God' resonated deeply. Silence is powerful.", created_at: "2025-07-07T05:30:00Z" },
      { content: "Fasting from social media this week. The mental clarity and extra time for prayer has been eye-opening. What else am I enslaved to?", created_at: "2025-07-09T19:20:00Z" },
      { content: "Joined a spiritual direction group. Having a guide in the spiritual journey feels like finding a missing piece. Excited for this season.", created_at: "2025-07-11T18:00:00Z" },
      { content: "Memorizing Scripture intentionally now. God's Word hidden in my heart is changing how I think and respond to challenges.", created_at: "2025-07-13T06:15:00Z" },
      { content: "Practicing the examen each night - reviewing my day for God's presence. I'm seeing His fingerprints in places I overlooked before.", created_at: "2025-07-15T23:30:00Z" },
      { content: "Reading the mystics - Teresa of Avila, John of the Cross. Their depth of intimacy with God challenges and inspires me.", created_at: "2025-07-17T21:45:00Z" },
      { content: "Reflecting on this month's growth. Spiritual disciplines aren't burdens but pathways to freedom. Grateful for this deepening journey with God.", created_at: "2025-07-19T20:00:00Z" }
    ]
  }
];

// Main test runner
async function runTests() {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable not set');
    process.exit(1);
  }

  console.log('🚀 Starting Mirror Generation Content Filter Tests');
  console.log(`📊 Testing ${NUM_SETS} sets × ${TRIALS_PER_SET} trials = ${NUM_SETS * TRIALS_PER_SET} total tests\n`);

  const results = [];
  let totalTests = 0;
  let contentFilterCount = 0;

  for (const set of journalSets) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${set.name}`);
    console.log('='.repeat(60));

    for (let trial = 1; trial <= TRIALS_PER_SET; trial++) {
      totalTests++;
      const result = await generateMirror(set.journals, set.name, trial);
      results.push(result);

      if (result.contentFilterTriggered) {
        contentFilterCount++;
      }

      // Save individual result
      const filename = `${set.name.replace(/[^a-z0-9]/gi, '_')}_trial${trial}.json`;
      fs.writeFileSync(
        path.join(OUTPUT_DIR, filename),
        JSON.stringify(result, null, 2)
      );

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Generate summary report
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total tests: ${totalTests}`);
  console.log(`Content filter triggered: ${contentFilterCount} (${(contentFilterCount/totalTests * 100).toFixed(1)}%)`);
  console.log(`Successful completions: ${totalTests - contentFilterCount} (${((totalTests - contentFilterCount)/totalTests * 100).toFixed(1)}%)`);

  // Break down by set
  console.log(`\n📋 Results by Set:`);
  for (const set of journalSets) {
    const setResults = results.filter(r => r.testName === set.name);
    const setFilterCount = setResults.filter(r => r.contentFilterTriggered).length;
    console.log(`  ${set.name}: ${setFilterCount}/${TRIALS_PER_SET} triggered filter`);
  }

  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    totalTests,
    contentFilterCount,
    successRate: ((totalTests - contentFilterCount) / totalTests * 100).toFixed(1),
    resultsBySet: journalSets.map(set => ({
      name: set.name,
      trials: TRIALS_PER_SET,
      filterTriggers: results.filter(r => r.testName === set.name && r.contentFilterTriggered).length,
    })),
    allResults: results.map(r => ({
      testName: r.testName,
      trialNum: r.trialNum,
      success: r.success,
      contentFilterTriggered: r.contentFilterTriggered,
      finishReason: r.finishReason,
      tokensUsed: r.usage?.total_tokens,
      error: r.error,
    }))
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log(`\n✅ Results saved to: ${OUTPUT_DIR}`);
  console.log(`📄 Summary: ${path.join(OUTPUT_DIR, 'summary.json')}`);
}

// Run tests
runTests().catch(console.error);

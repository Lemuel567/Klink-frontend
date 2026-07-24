// Daily Bible verse — a curated rotation keyed by the day of the year, so
// everyone in the church sees the same verse each day and it changes daily.
// Text is the World English Bible (WEB), which is in the public domain.

export interface DailyVerse {
  reference: string;
  text: string;
}

const VERSES: DailyVerse[] = [
  { reference: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, says Yahweh, thoughts of peace, and not of evil, to give you hope and a future.' },
  { reference: 'Philippians 4:13', text: 'I can do all things through Christ, who strengthens me.' },
  { reference: 'Psalm 23:1', text: 'Yahweh is my shepherd; I shall lack nothing.' },
  { reference: 'Proverbs 3:5', text: 'Trust in Yahweh with all your heart, and don’t lean on your own understanding.' },
  { reference: 'Isaiah 40:31', text: 'But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.' },
  { reference: 'Romans 8:28', text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.' },
  { reference: 'Joshua 1:9', text: 'Haven’t I commanded you? Be strong and courageous. Don’t be afraid, neither be dismayed; for Yahweh your God is with you wherever you go.' },
  { reference: 'Matthew 6:33', text: 'But seek first God’s Kingdom and his righteousness; and all these things will be given to you as well.' },
  { reference: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.' },
  { reference: 'John 3:16', text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.' },
  { reference: '2 Corinthians 5:7', text: 'For we walk by faith, not by sight.' },
  { reference: 'Psalm 118:24', text: 'This is the day that Yahweh has made. We will rejoice and be glad in it!' },
  { reference: 'Isaiah 41:10', text: 'Don’t be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.' },
  { reference: 'Philippians 4:6', text: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.' },
  { reference: 'Matthew 11:28', text: 'Come to me, all you who labor and are heavily burdened, and I will give you rest.' },
  { reference: 'Psalm 27:1', text: 'Yahweh is my light and my salvation. Whom shall I fear? Yahweh is the strength of my life. Of whom shall I be afraid?' },
  { reference: 'Proverbs 18:10', text: 'Yahweh’s name is a strong tower: the righteous run to him, and are safe.' },
  { reference: 'Romans 12:2', text: 'Don’t be conformed to this world, but be transformed by the renewing of your mind.' },
  { reference: 'Galatians 5:22', text: 'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith.' },
  { reference: 'Hebrews 11:1', text: 'Now faith is assurance of things hoped for, proof of things not seen.' },
  { reference: '1 Corinthians 13:4', text: 'Love is patient and is kind. Love doesn’t envy. Love doesn’t brag, is not proud.' },
  { reference: 'Psalm 34:8', text: 'Oh taste and see that Yahweh is good. Blessed is the man who takes refuge in him.' },
  { reference: 'Matthew 5:16', text: 'Even so, let your light shine before men, that they may see your good works and glorify your Father who is in heaven.' },
  { reference: 'Psalm 119:105', text: 'Your word is a lamp to my feet, and a light for my path.' },
  { reference: 'Colossians 3:23', text: 'And whatever you do, work heartily, as for the Lord, and not for men.' },
  { reference: '1 Peter 5:7', text: 'Casting all your worries on him, because he cares for you.' },
  { reference: 'Psalm 37:4', text: 'Also delight yourself in Yahweh, and he will give you the desires of your heart.' },
  { reference: 'John 14:6', text: 'Jesus said to him, “I am the way, the truth, and the life. No one comes to the Father, except through me.”' },
  { reference: 'Ephesians 2:8', text: 'For by grace you have been saved through faith, and that not of yourselves; it is the gift of God.' },
  { reference: 'Psalm 121:1', text: 'I will lift up my eyes to the hills. Where does my help come from? My help comes from Yahweh, who made heaven and earth.' },
  { reference: 'Lamentations 3:22', text: 'It is because of Yahweh’s loving kindnesses that we are not consumed, because his compassion doesn’t fail.' },
  { reference: 'Micah 6:8', text: 'He has shown you, O man, what is good. What does Yahweh require of you, but to act justly, to love mercy, and to walk humbly with your God?' },
  { reference: 'James 1:2', text: 'Count it all joy, my brothers, when you fall into various temptations.' },
  { reference: '2 Timothy 1:7', text: 'For God didn’t give us a spirit of fear, but of power, love, and self-control.' },
  { reference: 'Psalm 139:14', text: 'I will give thanks to you, for I am fearfully and wonderfully made. Your works are wonderful. My soul knows that very well.' },
  { reference: 'Deuteronomy 31:6', text: 'Be strong and courageous. Don’t be afraid or scared of them; for Yahweh your God himself is who goes with you. He will not fail you nor forsake you.' },
];

/** The verse for a given date (defaults to today), stable per calendar day. */
export function getDailyVerse(date = new Date()): DailyVerse {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return VERSES[dayOfYear % VERSES.length];
}

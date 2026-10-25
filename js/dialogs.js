// Conversations between the two players at the table, Nicaea c. AD 325.
// E = Theodoros, an elderly decurion and olive-oil merchant (Player A's figure)
// Y = Markianos, a young scribe in the governor's office (Player B's figure)
// Each line: [speaker, Turkish, English]

export const CHARACTERS = {
  E: { tr: 'Theodoros', en: 'Theodoros', role: { tr: 'meclis üyesi, zeytinyağı tüccarı', en: 'city councillor, olive-oil merchant' } },
  Y: { tr: 'Markianos', en: 'Markianos', role: { tr: 'vali yazıhanesinde kâtip', en: 'scribe in the governor\'s office' } },
};

export const CONVERSATIONS = [
  // The Council of Nicaea, summer 325
  [
    ['E', 'Şehir piskoposlarla doldu, Markianos. Hanlarda yatacak yer kalmadı.', 'The city is full of bishops, Markianos. Not a bed left in the inns.'],
    ['Y', 'İmparator Konstantinos onları sarayda toplayacakmış. Üç yüzden fazla piskopos diyorlar.', 'They say Emperor Constantine will gather them in the palace. More than three hundred bishops.'],
    ['E', 'Hepsi İskenderiyeli bir rahibin, Arius\'un sözleri yüzünden. Oğul, Baba ile bir mi, değil mi?', 'All because of the words of a priest from Alexandria, Arius. Is the Son one with the Father, or not?'],
    ['Y', 'Benim derdim daha basit. Devlet postasının bütün arabaları onlara ayrıldı. Mektuplarım Nikomedeia\'ya gidemiyor.', 'My trouble is simpler. Every cart of the imperial post is reserved for them. My letters can\'t reach Nicomedia.'],
    ['E', 'Sabret. İmparator gelirse çarşı da kazanır. Zeytinyağımı iki katına satarım.', 'Patience. If the Emperor comes, the market wins too. I\'ll sell my oil at twice the price.'],
  ],
  // The burden of the curiales
  [
    ['E', 'Bu yılın vergisi yine ağır. Tahsilatı biz meclis üyelerinin sırtına yüklediler.', 'This year\'s tax is heavy again. They\'ve put the collecting on the backs of us councillors.'],
    ['Y', 'Toplanamayan vergiyi kendi cebinizden mi ödüyorsunuz?', 'And what can\'t be collected, you pay from your own purse?'],
    ['E', 'Elbette. Eskiden decurio olmak şerefti, şimdi ceza. Komşum Eutropios sırf meclisten kurtulmak için orduya yazıldı.', 'Of course. Being a decurion used to be an honour; now it\'s a punishment. My neighbour Eutropios joined the army just to escape the council.'],
    ['Y', 'Babam da hep "Asla meclise girme" derdi. Ben de valinin yazıhanesinde kâtip oldum.', 'My father always said, "Never join the council." So I became a scribe in the governor\'s office.'],
    ['E', 'Akıllı adammış. Benim oğlan ise tutturdu, rhetor olacakmış. Sanki laf karın doyuruyor.', 'A wise man. My boy insists on becoming a rhetor. As if words fill the belly.'],
  ],
  // Rivalry with Nicomedia
  [
    ['Y', 'Nikomedeialılar yine kendilerine "Bithynia\'nın birinci şehri" diyorlar.', 'The Nicomedians are calling themselves "the first city of Bithynia" again.'],
    ['E', 'Ha! Bizim surlarımız, tiyatromuz, gölümüz var. Onlarınki ne, imparatorun eski sarayı mı?', 'Ha! We have our walls, our theatre, our lake. What do they have, the emperor\'s old palace?'],
    ['Y', 'Dion Chrysostomos iki yüz yıl önce bile "Bu kavgayı bırakın" demiş.', 'Even Dio Chrysostom told both cities to drop this quarrel, two hundred years ago.'],
    ['E', 'Bıraktık mı? Bırakmadık. Bu oyunu da Nikomedeia\'ya karşı oynuyormuş gibi oynuyorum.', 'Did we drop it? We did not. I play this very game as if I were playing Nicomedia.'],
  ],
  // The Gothic raid of 258 and the walls
  [
    ['E', 'Dedem anlatırdı: Gotlar geldiğinde şehri ateşe verdiler, tapınakları yağmaladılar.', 'My grandfather used to tell it: when the Goths came they set the city on fire and looted the temples.'],
    ['Y', 'Surlar o yüzden mi bu kadar yüksek?', 'Is that why the walls are so high?'],
    ['E', 'İmparator Claudius zamanında yeniden örüldü. Bir sıra taş, bir sıra tuğla. Her mahalle işçi verdi.', 'They were rebuilt under Emperor Claudius. A course of stone, a course of brick. Every quarter sent workers.'],
    ['Y', 'Şimdi Gotların çoğu bizim orduda asker. Zaman ne garip.', 'Now half the Goths serve in our army. Strange times.'],
  ],
  // Family: a daughter's wedding
  [
    ['E', 'Kızım Theodora\'nın düğünü gelecek bahar. Çeyiz için iki zeytinlik ve bir dokuma tezgâhı istiyorlar.', 'My daughter Theodora marries next spring. For the dowry they want two olive groves and a loom.'],
    ['Y', 'Damat kim?', 'Who is the groom?'],
    ['E', 'Göl kıyısındaki çömlekçinin oğlu. İyi çocuk, ama annesi her şeye karışıyor.', 'The son of the potter by the lake. A good lad, but his mother meddles in everything.'],
    ['Y', 'Benimki de öyle. Her akşam "Ne zaman evleneceksin?" diye soruyor.', 'Mine is the same. Every evening: "When will you marry?"'],
    ['E', 'Bu oyunu kazan, belki bir başlık parası çıkar.', 'Win this game and maybe you\'ll have a bride-price.'],
  ],
  // Prices and coinage
  [
    ['Y', 'Bu sabah çarşıda balık çok pahalıydı. Göldeki balıkçılar ağları bırakmış.', 'Fish was terribly dear in the market this morning. The lake fishermen have left their nets.'],
    ['E', 'Hepsi piskoposların hizmetkârlarına satıyor. Bir de para meselesi var: yeni follis her yıl biraz daha hafif.', 'They all sell to the bishops\' servants. And then the coin: each year the new follis is a little lighter.'],
    ['Y', 'Diocletianus fiyatları fermanla sabitlemeye çalışmıştı, değil mi?', 'Diocletian tried to fix prices by edict, didn\'t he?'],
    ['E', 'Çalıştı da ne oldu? Mallar çarşıdan kayboldu. Fiyatı ferman değil, hasat belirler.', 'He tried, and what happened? Goods vanished from the market. The harvest sets the price, not the edict.'],
  ],
  // The founding of Constantinople
  [
    ['Y', 'Duydun mu? İmparator Byzantion\'u yeniden kuruyor. Adını kendi adına çevirecekmiş.', 'Have you heard? The Emperor is refounding Byzantium. He\'ll name it after himself.'],
    ['E', 'Konstantinopolis... Bütün ustaları, mermercileri oraya çekecek.', 'Constantinople... He\'ll draw every builder and marble-cutter there.'],
    ['Y', 'Prokonnesos mermeri de oraya gidecek. Bu tabla bile o adanın mermerinden.', 'The Proconnesian marble will go there too. Even this board is from that island.'],
    ['E', 'Taş ustamız Paulos şimdiden gitmek istiyor. Ücretler iki katıymış.', 'Our mason Paulos already wants to go. They say the wages are double.'],
  ],
  // Illness, doctors and gods
  [
    ['E', 'Küçük oğlum üç gündür ateşler içinde. Hekim Galenos\'un kitaplarına bakıp kan aldı.', 'My little son has had a fever for three days. The physician looked in Galen\'s books and bled him.'],
    ['Y', 'Asklepios\'a adak adadınız mı?', 'Did you make a vow to Asclepius?'],
    ['E', 'Karım kilisede dua ediyor, kayınvalidem tapınağa adak bırakıyor. Hangisi işe yararsa.', 'My wife prays in the church, my mother-in-law leaves offerings at the temple. Whichever works.'],
    ['Y', 'Akşam hamama götürün. Sıcak su iyi gelir.', 'Take him to the baths this evening. The warm water will help.'],
  ],
  // Peasants bound to the land
  [
    ['E', 'Zeytin hasadı yaklaştı ama işçi bulamıyorum. Köylüler toprağa bağlandı, başka yerde çalışamıyorlar.', 'The olive harvest is near, but I can\'t find workers. The peasants are bound to the land and can\'t work elsewhere.'],
    ['Y', 'Yeni kanun öyle: colonus doğduğu topraktan ayrılamaz.', 'That\'s the new law: a colonus may not leave the land he was born on.'],
    ['E', 'Toprak sahibine iyi, köylüye zor. Bu çağda herkesin bir zinciri var, Markianos.', 'Good for the landowner, hard on the peasant. In this age everyone wears some chain, Markianos.'],
  ],
  // The cracked theatre (Pliny, Letters X.39)
  [
    ['Y', 'Tiyatronun duvarındaki çatlak büyüyor. Geçen gün bir parça daha düştü.', 'The crack in the theatre wall is growing. Another piece fell the other day.'],
    ['E', 'Plinius zamanından beri böyle! Vali Plinius imparator Traianus\'a yazmış: "Nikaialılar tiyatroya on milyon sestertius harcadı ve bina çöküyor."', 'It\'s been like that since Pliny! Governor Pliny wrote to Emperor Trajan: "The Nicaeans have spent ten million sesterces on the theatre and it is sinking."'],
    ['Y', 'İki yüz yıldır tamir edemedik mi?', 'And in two hundred years we haven\'t repaired it?'],
    ['E', 'Meclis her yıl karar alır, kimse para vermez. İşte Nikaia.', 'The council votes on it every year and nobody pays. That\'s Nicaea for you.'],
  ],
  // Old gods and the new faith
  [
    ['Y', 'Kardeşim vaftiz oldu. Artık tapınaktaki kurbanlara gelmiyor.', 'My brother has been baptised. He no longer comes to the sacrifices at the temple.'],
    ['E', 'Bizim evde de öyle. Karım Hristiyan, ben hâlâ ev tanrılarına bir parça ekmek bırakıyorum.', 'It\'s the same in my house. My wife is a Christian; I still leave a piece of bread for the household gods.'],
    ['Y', 'Daha yirmi yıl önce Diocletianus Hristiyanları zindana atıyordu. Şimdi imparator onlara kilise yaptırıyor.', 'Only twenty years ago Diocletian was throwing Christians in prison. Now the emperor builds them churches.'],
    ['E', 'Zarlar gibi, evlat. Bir gün biri üstte, ertesi gün öbürü.', 'Like dice, my boy. One day one side is up, the next day the other.'],
  ],
  // The civil war of 324
  [
    ['E', 'Geçen yıl Licinius\'un askerleri buradan geçerken ambarımı boşalttılar.', 'Last year Licinius\'s soldiers emptied my storehouse as they marched through.'],
    ['Y', 'Khrysopolis\'te yenildi. Artık tek imparator var.', 'He was beaten at Chrysopolis. Now there is only one emperor.'],
    ['E', 'Tek imparator, tek vergi tahsildarı. Hiç değilse ikisine birden ödemiyoruz.', 'One emperor, one tax collector. At least we no longer pay two.'],
  ],
  // Work at the governor's office
  [
    ['Y', 'Bugün yazıhanede bütün gün tapu kayıtlarını kopyaladım. Her zeytin ağacı sayılıyor.', 'Today at the office I copied land registers all day. Every olive tree gets counted.'],
    ['E', 'Sayılan her ağaç, ödenecek bir vergi demek. Benimkileri az yaz, olur mu?', 'Every tree counted is a tax to pay. Write mine down a little short, will you?'],
    ['Y', 'Theodoros! Beni madenlere mi göndermek istiyorsun?', 'Theodoros! Do you want me sent to the mines?'],
    ['E', 'Şaka, şaka. At zarı, evlat.', 'A joke, a joke. Throw the dice, my boy.'],
  ],
];

// Short reactions to game events
export const REACTIONS = {
  hit: [
    ['Taşın meclise gitti. Önce vergi borcunu ödesin!', 'Your piece went to the council. Let it pay its taxes first!'],
    ['Gotlar gibi baskın yaptım!', 'I raided you like the Goths!'],
    ['Yalnız kalan taş, yolda kalan yolcuya benzer.', 'A lone piece is like a lone traveller on the road.'],
  ],
  wasHit: [
    ['Bu tam bir Nikomedeia işi!', 'That is pure Nicomedia!'],
    ['Ah! Licinius\'un askerlerinden beter.', 'Ah! Worse than Licinius\'s soldiers.'],
  ],
  out: [
    ['Zar tabladan kaçtı! Kötü alamet...', 'The die jumped off the board! A bad omen...'],
    ['Fortuna yüzünü çevirdi.', 'Fortuna has turned her face away.'],
  ],
  win: [
    ['Fortuna bugün benden yana!', 'Fortuna is with me today!'],
    ['Bu zafer bir şarap eder. Benden!', 'This victory is worth a jug of wine. On me!'],
  ],
};

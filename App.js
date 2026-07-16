import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Platform, Alert } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen'; // 🌟 스플래시 스크린 추가

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, getDocs, updateDoc, writeBatch, increment, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// 🌟 앱 시작 시 스플래시 화면 자동 숨김 방지
SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // Alert 대신 Banner 사용
    shouldShowList: true,   // 알림 센터 리스트에 표시
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const MONTH_OPTIONS = Array.from({length: 12}, (_, i) => `${i + 1}월`);
const DAY_OPTIONS = Array.from({length: 31}, (_, i) => `${i + 1}일`);
const TIME_OPTIONS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const LOCATION_OPTIONS = ['Rick Oden Park (Garland)', 'Reverchon Park (Dallas Downtown)', 'Railroad Park (Lewisville)', '기타 구장(미정)'];
const OPPONENT_OPTIONS = ['Grand Prairie Expos', 'Uptown Grays', 'Victory Park Indians', 'Ganns Bulls', 'Downtown Expos', 'Dallas Dodgers', 'Dallas Defenders'];
// 🌟 OUT 포지션 유지
const POSITION_OPTIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'bench', 'OUT'];

const CustomPicker = ({ label, options, selectedValue, onValueChange, flex = 1, marginRight = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={{ flex, marginRight, marginBottom: 10 }}>
      <TouchableOpacity
        style={[styles.input, { marginBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={{ color: selectedValue ? '#0f172a' : '#94a3b8', fontSize: 13 }} numberOfLines={1}>
          {selectedValue || label}
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 10 }}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderTopWidth: 0, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, maxHeight: 150 }}>
          <ScrollView nestedScrollEnabled={true}>
            {options.map((opt, idx) => (
              <TouchableOpacity key={idx} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }} 
                onPress={() => { onValueChange(opt); setIsOpen(false); }}>
                <Text style={{ color: '#334155', fontSize: 13 }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [appIsReady, setAppIsReady] = useState(false); // 🌟 스플래시 화면 딜레이용 상태 추가
  
  const [user, setUser] = useState(null); 
  const [hasProfile, setHasProfile] = useState(false); 
  const [userRole, setUserRole] = useState('player'); 
  const [userStatus, setUserStatus] = useState('pending'); 
  const [userName, setUserName] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true); 
  const [registerName, setRegisterName] = useState('');
  const [backNumber, setBackNumber] = useState('');

  const [nextGame, setNextGame] = useState({ date: '로딩 중...', location: '', opponent: '' });
  
  const [noticeMonth, setNoticeMonth] = useState('');
  const [noticeDay, setNoticeDay] = useState('');
  const [noticeTime, setNoticeTime] = useState('');
  const [noticeLocation, setNoticeLocation] = useState('');
  const [noticeOpponent, setNoticeOpponent] = useState('');
  
  const [gameOpponent, setGameOpponent] = useState('');
  const [gameMonth, setGameMonth] = useState('');
  const [gameDay, setGameDay] = useState('');
  const [gameTime, setGameTime] = useState('');
  const [gameNumber, setGameNumber] = useState('');
  
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [boxScore, setBoxScore] = useState({});
  const [teamUsers, setTeamUsers] = useState([]);
  const [expoPushToken, setExpoPushToken] = useState('');

  const [selectedSeason, setSelectedSeason] = useState('2026 Summer');
  const [sortConfig, setSortConfig] = useState({ key: 'AVG', direction: 'desc' });
  const [activePositionUserId, setActivePositionUserId] = useState(null);

  const [selectedGameTeam, setSelectedGameTeam] = useState('1팀'); 
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('전체');

  const [swapTargetId, setSwapTargetId] = useState(null);

  // 🌟 강제로 2초간 딜레이를 주는 효과
  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  // 🌟 파이어베이스 로딩과 2초 딜레이가 모두 끝나면 스플래시 화면 끄기
  useEffect(() => {
    if (appIsReady && !loading) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady, loading]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserRole(data.role); 
          setUserStatus(data.status || 'pending');
          setUserName(data.name || '');
          setHasProfile(true); 
          registerForPushNotificationsAsync().then(token => {
            if (token) setDoc(doc(db, "users", currentUser.uid), { pushToken: token }, { merge: true });
          });
        } else {
          setUserRole('player'); setUserStatus('pending'); setHasProfile(false); 
        }
      } else {
        setUser(null); setHasProfile(false); setUserRole('player'); setUserStatus('pending');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!hasProfile) return; 

    const unsubSchedule = onSnapshot(doc(db, "schedule", "next_game"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNextGame(data);
        setNoticeMonth(data.month || ''); setNoticeDay(data.day || ''); setNoticeTime(data.time || '');
        setNoticeLocation(data.location || ''); setNoticeOpponent(data.opponent || '');
      }
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersList = [];
      snapshot.forEach((doc) => { usersList.push({ id: doc.id, ...doc.data() }); });
      setTeamUsers(usersList);
    });

    const unsubCurrentGame = onSnapshot(doc(db, "schedule", "current_game_draft"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameOpponent(data.opponent || ''); setGameMonth(data.gameMonth || ''); setGameDay(data.gameDay || ''); 
        setGameTime(data.time || ''); setGameNumber(data.gameNumber || ''); 
        setSelectedPlayerIds(data.selectedPlayerIds || []); setBoxScore(data.boxScore || {});
        if(data.selectedGameTeam) setSelectedGameTeam(data.selectedGameTeam);
      } else {
        setGameOpponent(''); setGameMonth(''); setGameDay(''); setGameTime(''); setGameNumber('');
        setSelectedPlayerIds([]); setBoxScore({}); setSelectedGameTeam('1팀');
      }
    });

    return () => { unsubSchedule(); unsubUsers(); unsubCurrentGame(); };
  }, [hasProfile]);

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') finalStatus = (await Notifications.requestPermissionsAsync()).status;
      if (finalStatus !== 'granted') return;
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        if (!projectId) return;
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch (error) { console.log(error); }
    }
    return token;
  }

  const handleAuth = async () => {
    if (!email || !password) return alert("이메일과 비밀번호를 입력해주세요.");
    try {
      if (isLoginMode) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) { alert("인증 실패: " + error.message); }
  };

  const handleSaveProfile = async () => {
    if (!registerName || !backNumber) return alert("이름과 등번호를 모두 입력해주세요!");
    try {
      const currentSeason = '2026 Summer'; 
      await setDoc(doc(db, "users", user.uid), {
        name: registerName, backNumber: Number(backNumber), role: "player", email: user.email, status: "pending", 
        seasons: { [currentSeason]: { atBats: 0, hits: 0, doubles: 0, triples: 0, homeRuns: 0, runs: 0, rbi: 0 } }
      });
      setUserRole("player"); setUserStatus("pending"); setHasProfile(true);
      setUserName(registerName);
      alert(`환영합니다, ${registerName} 선수! 감독님의 가입 승인을 기다려주세요.`);
    } catch (e) { alert("프로필 저장 실패: " + e.message); }
  };

  const handleUpdateUserStatus = async (uid, newStatus, playerName) => {
    try { await updateDoc(doc(db, "users", uid), { status: newStatus }); alert(`${playerName} 선수가 변경되었습니다.`); } 
    catch (e) { alert("변경 실패: " + e.message); }
  };

  const handleUpdateSchedule = async () => {
    if (!noticeMonth || !noticeDay || !noticeTime || !noticeLocation || !noticeOpponent) {
      return alert('모든 일정 정보를 드롭다운에서 선택해주세요!');
    }
    try {
      const formattedDate = `${noticeMonth} ${noticeDay} ${noticeTime}`;
      await setDoc(doc(db, "schedule", "next_game"), { 
        month: noticeMonth, day: noticeDay, time: noticeTime, 
        location: noticeLocation, opponent: noticeOpponent, date: formattedDate 
      });
      
      const querySnapshot = await getDocs(query(collection(db, "users"))); 
      const pushTokens = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.pushToken && data.status === 'approved') pushTokens.push(data.pushToken); 
      });
      
      const uniqueTokens = [...new Set(pushTokens)];
      const messages = uniqueTokens.map(token => ({
        to: token, sound: 'default', title: '⚾Dallas Monsters 공지⚾', 
        body: `다음 경기 일정 업데이트 (${formattedDate} @ ${noticeLocation})`
      }));

      if (messages.length > 0) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST', headers: { Accept: 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
          body: JSON.stringify(messages),
        });
      }
      alert('경기 일정이 성공적으로 공지되었습니다!');
    } catch (e) { alert('실패: ' + e.message); }
  };

  const togglePlayerSelection = (playerId) => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(prev => prev.filter(id => id !== playerId));
      setBoxScore(prev => { const copy = { ...prev }; delete copy[playerId]; return copy; });
    } else {
      setSelectedPlayerIds(prev => [...prev, playerId]);
      setBoxScore(prev => ({ ...prev, [playerId]: { position: '', atBats: 0, hits: 0, doubles: 0, triples: 0, homeRuns: 0, runs: 0, rbi: 0 } }));
    }
  };

  const adjustStat = (playerId, field, amount) => {
    const currentVal = Number(boxScore[playerId]?.[field] || 0);
    const newVal = Math.max(0, currentVal + amount); 
    setBoxScore(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: newVal } }));
  };

  // 🌟 포지션 변경 시 bench/OUT 이면 맨 밑으로 자동 이동
  const handlePositionChange = (playerId, text) => {
    setBoxScore(prev => ({ ...prev, [playerId]: { ...prev[playerId], position: text } }));
    
    if (text === 'bench' || text === 'OUT') {
      setSelectedPlayerIds(prev => {
        const filtered = prev.filter(id => id !== playerId);
        return [...filtered, playerId];
      });
    }
  };

  const handlePlayerTap = (playerId) => {
    if (swapTargetId === null) {
      setSwapTargetId(playerId);
    } else if (swapTargetId === playerId) {
      setSwapTargetId(null);
    } else {
      const idA = swapTargetId;
      const idB = playerId;

      setSelectedPlayerIds(prev => {
        const newArray = [...prev];
        const indexA = newArray.indexOf(idA);
        const indexB = newArray.indexOf(idB);
        newArray[indexA] = idB;
        newArray[indexB] = idA;
        return newArray;
      });

      setBoxScore(prev => {
        const posA = prev[idA]?.position || '';
        const posB = prev[idB]?.position || '';
        return {
          ...prev,
          [idA]: { ...prev[idA], position: posB },
          [idB]: { ...prev[idB], position: posA }
        };
      });

      setSwapTargetId(null);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await setDoc(doc(db, "schedule", "current_game_draft"), { 
        opponent: gameOpponent, gameMonth, gameDay, time: gameTime, gameNumber, selectedPlayerIds, boxScore,
        selectedGameTeam
      });
      alert("💾 라인업 및 성적이 임시 저장되었습니다.");
    } catch (e) { alert("임시 저장 실패: " + e.message); }
  };

  const handleSendFinal = async () => {
    if (!gameOpponent || !gameMonth || !gameDay) return alert("경기 상대와 날짜를 선택해주세요.");
    if (selectedPlayerIds.length === 0) return alert("참여 선수를 선택해주세요.");

    try {
      const batch = writeBatch(db);
      const currentSeason = '2026 Summer'; 
      const teamSeasonKey = `${currentSeason}_${selectedGameTeam}`;
      const formattedGameDate = `${gameMonth} ${gameDay}`;

      const newGameRef = doc(collection(db, "games"));
      batch.set(newGameRef, {
        opponent: gameOpponent, date: formattedGameDate, time: gameTime, gameNumber: Number(gameNumber) || 1, createdAt: new Date(),
        team: selectedGameTeam,
        rosterRecords: selectedPlayerIds.map(id => ({
          uid: id, name: teamUsers.find(u => u.id === id)?.name || '알수없음', backNumber: teamUsers.find(u => u.id === id)?.backNumber || 0, position: boxScore[id]?.position || '',
          atBats: Number(boxScore[id]?.atBats || 0), hits: Number(boxScore[id]?.hits || 0), doubles: Number(boxScore[id]?.doubles || 0), triples: Number(boxScore[id]?.triples || 0),
          homeRuns: Number(boxScore[id]?.homeRuns || 0), runs: Number(boxScore[id]?.runs || 0), rbi: Number(boxScore[id]?.rbi || 0),
        }))
      });

      selectedPlayerIds.forEach(id => {
        const userRef = doc(db, "users", id);
        const playerStat = boxScore[id] || {};
        batch.update(userRef, {
          [`seasons.${teamSeasonKey}.atBats`]: increment(Number(playerStat.atBats || 0)),
          [`seasons.${teamSeasonKey}.hits`]: increment(Number(playerStat.hits || 0)),
          [`seasons.${teamSeasonKey}.doubles`]: increment(Number(playerStat.doubles || 0)),
          [`seasons.${teamSeasonKey}.triples`]: increment(Number(playerStat.triples || 0)),
          [`seasons.${teamSeasonKey}.homeRuns`]: increment(Number(playerStat.homeRuns || 0)),
          [`seasons.${teamSeasonKey}.runs`]: increment(Number(playerStat.runs || 0)),
          [`seasons.${teamSeasonKey}.rbi`]: increment(Number(playerStat.rbi || 0)),
        });
      });

      const draftRef = doc(db, "schedule", "current_game_draft");
      batch.delete(draftRef);
      await batch.commit();

      setGameOpponent(''); setGameMonth(''); setGameDay(''); setGameTime(''); setGameNumber(''); setSelectedPlayerIds([]); setBoxScore({});
      alert(`🚀 최종 스탯이 [${selectedGameTeam}] 시즌 기록에 누적되었습니다!`);
    } catch (e) { alert("전송 실패: " + e.message); }
  };

  const handleLogout = () => signOut(auth);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const sortedLeaderboard = () => {
    let rawData = teamUsers
      .filter(u => u.status === 'approved' && u.role !== 'admin')
      .map(u => {
        const allSeasons = u.seasons || {};
        let stats = { atBats: 0, hits: 0, doubles: 0, triples: 0, homeRuns: 0, runs: 0, rbi: 0 };
        
        if (selectedTeamFilter === '전체') {
          const team1 = allSeasons[`${selectedSeason}_1팀`] || {};
          const team2 = allSeasons[`${selectedSeason}_2팀`] || {};
          const legacy = allSeasons[selectedSeason] || {}; 
          const fields = ['atBats', 'hits', 'doubles', 'triples', 'homeRuns', 'runs', 'rbi'];
          
          fields.forEach(f => {
             stats[f] = Number(team1[f] || 0) + Number(team2[f] || 0) + Number(legacy[f] || 0);
          });
        } else {
          stats = allSeasons[`${selectedSeason}_${selectedTeamFilter}`] || { atBats: 0, hits: 0, doubles: 0, triples: 0, homeRuns: 0, runs: 0, rbi: 0 };
        }

        const ab = Number(stats.atBats || 0);
        const h = Number(stats.hits || 0);
        const avgRaw = ab > 0 ? (h / ab) : 0;
        const avgDisplay = avgRaw.toFixed(3).replace(/^0\./, '.'); 

        return {
          id: u.id, name: u.name, backNumber: u.backNumber,
          AVG: avgRaw, AVG_display: avgDisplay,
          AB: ab, H: h,
          '2B': Number(stats.doubles || 0), '3B': Number(stats.triples || 0),
          HR: Number(stats.homeRuns || 0), R: Number(stats.runs || 0), RBI: Number(stats.rbi || 0)
        };
      });

    rawData.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return rawData;
  };

  const renderNextGameDisplay = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>공지된 다음 경기 일정</Text>
      <View style={styles.divider} />
      <Text style={styles.gameInfo}>일시: {nextGame.date}</Text>
      <Text style={styles.gameInfo}>장소: {nextGame.location}</Text>
      <Text style={styles.gameInfo}>상대: {nextGame.opponent}</Text>
    </View>
  );

  const renderSeasonStandings = () => (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={[styles.cardTitle, { marginBottom: 0 }]}>{selectedSeason} 시즌 타자 랭킹</Text>
        <View style={{ flexDirection: 'row' }}>
          {['2026 Summer'].map(seasonName => (
            <TouchableOpacity key={seasonName} onPress={() => setSelectedSeason(seasonName)} 
              style={[styles.seasonChip, selectedSeason === seasonName && styles.seasonChipActive]}>
              <Text style={[styles.seasonChipText, selectedSeason === seasonName && styles.seasonChipTextActive]}>{seasonName}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        {['전체', '1팀', '2팀'].map(team => (
          <TouchableOpacity key={team} onPress={() => setSelectedTeamFilter(team)} 
            style={[styles.seasonChip, selectedTeamFilter === team && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]}>
            <Text style={[styles.seasonChipText, selectedTeamFilter === team && { color: '#ffffff' }]}>{team}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={{fontSize: 11, color: '#64748b', marginBottom: 8}}>* 상단의 스탯 이름(AVG, HR 등)을 터치하여 정렬할 수 있습니다.</Text>

      <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
        <View style={{ flexDirection: 'column' }}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { width: 90, textAlign: 'left' }]}>선수명</Text>
            {['AVG', 'AB', 'R', 'H', '2B', '3B', 'HR', 'RBI'].map((statKey) => (
              <TouchableOpacity key={statKey} style={{ width: 65, alignItems: 'center' }} onPress={() => requestSort(statKey)}>
                <Text style={[styles.tableHeaderCell, sortConfig.key === statKey && { color: '#0f172a', fontWeight: '900' }]}>
                  {statKey} {sortConfig.key === statKey ? (sortConfig.direction === 'desc' ? '▼' : '▲') : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {sortedLeaderboard().map((player, index) => (
            <View key={player.id} style={[styles.tableDataRow, index % 2 === 1 && { backgroundColor: '#f8fafc' }]}>
              <Text style={[styles.tableDataCell, { width: 90, fontWeight: 'bold' }]} numberOfLines={1}>
                <Text style={{color: '#94a3b8', fontSize: 11}}>{index+1}.</Text> {player.name}
              </Text>
              <Text style={[styles.tableDataCell, { width: 65, textAlign: 'center', fontWeight: 'bold', color: '#0f172a' }]}>{player.AVG_display}</Text>
              <Text style={[styles.tableDataCell, { width: 65, textAlign: 'center' }]}>{player.AB}</Text>
              <Text style={[styles.tableDataCell, { width: 65, textAlign: 'center' }]}>{player.R}</Text>
              <Text style={[styles.tableDataCell, { width: 65, textAlign: 'center' }]}>{player.H}</Text>
              <Text style={[styles.tableDataCell, { width: 65, textAlign: 'center' }]}>{player['2B']}</Text>
              <Text style={[styles.tableDataCell, { width: 65, textAlign: 'center' }]}>{player['3B']}</Text>
              <Text style={[styles.tableDataCell, { width: 65, textAlign: 'center' }]}>{player.HR}</Text>
              <Text style={[styles.tableDataCell, { width: 65, textAlign: 'center' }]}>{player.RBI}</Text>
            </View>
          ))}
          {sortedLeaderboard().length === 0 && <Text style={{padding: 10, textAlign: 'center', color: '#94a3b8'}}>이 조건에 기록된 선수가 없습니다.</Text>}
        </View>
      </ScrollView>
    </View>
  );

  // 🌟 핵심: 2초가 지나지 않았거나 파이어베이스 로딩 중이면 UI를 그리지 않고 스플래시 화면을 유지함
  if (!appIsReady || loading) {
    return null; 
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centerContainer}>
          <Text style={styles.appTitle}>⚾ Dallas Monsters</Text>
          <View style={{width: '85%', marginTop: 20}}>
            <TextInput style={styles.input} placeholder="이메일 주소" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="비밀번호 (6자리 이상)" value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={styles.button} onPress={handleAuth}><Text style={styles.buttonText}>{isLoginMode ? '로그인' : '회원가입'}</Text></TouchableOpacity>
            <TouchableOpacity style={{marginTop: 20, alignItems: 'center'}} onPress={() => setIsLoginMode(!isLoginMode)}><Text style={{color: '#1d4ed8', fontWeight: 'bold'}}>{isLoginMode ? '신규 가입하기' : '로그인하기'}</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (user && !hasProfile) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centerContainer}>
          <Text style={styles.appTitle}>신규 팀원 프로필 등록</Text>
          <View style={{width: '85%'}}>
            <TextInput style={styles.input} placeholder="본명 (예: 김타자)" value={registerName} onChangeText={setRegisterName} />
            <TextInput style={styles.input} placeholder="등번호 숫자 (예: 23)" keyboardType="numeric" value={backNumber} onChangeText={setBackNumber} />
            <TouchableOpacity style={styles.button} onPress={handleSaveProfile}><Text style={styles.buttonText}> 등록 완료</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loginToggleBar}>
          <Text style={styles.toggleText}>
            {userName ? `${userName} ${userRole === 'admin' ? '감독님' : '선수님'}` : user.email}
          </Text>          
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}><Text style={styles.logoutBtnText}>로그아웃</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          {userStatus === 'pending' && userRole !== 'admin' && (
            <View style={[styles.card, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
              <Text style={{fontSize: 15, fontWeight: 'bold', color: '#d97706', marginBottom: 4}}>⏳ 가입 승인 대기 중</Text>
              <Text style={{color: '#92400e', fontSize: 13}}>감독님이 가입을 승인해야 팀의 기록 시스템을 확인할 수 있습니다.</Text>
            </View>
          )}

          {/* --- 일반 승인된 선수 (Player) 화면 --- */}
          {userRole !== 'admin' && userStatus === 'approved' && (
            <View>
              {renderNextGameDisplay()}
              
              {selectedPlayerIds.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>라이브 라인업 & 스탯</Text>
                  <Text style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                    상대: {gameOpponent || '미정'} | 시합: {gameNumber ? `제 ${gameNumber}경기` : '-'} ({gameMonth} {gameDay} {gameTime})
                  </Text>
                  <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                    <View style={{ flexDirection: 'column' }}>
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableHeaderCell, { width: 115, textAlign: 'left' }]}>타순 / 선수명</Text>
                        <Text style={[styles.tableHeaderCell, { width: 70 }]}>포지션</Text>
                        <Text style={[styles.tableHeaderCell, { width: 60 }]}>AB</Text><Text style={[styles.tableHeaderCell, { width: 60 }]}>R</Text>
                        <Text style={[styles.tableHeaderCell, { width: 60 }]}>H</Text><Text style={[styles.tableHeaderCell, { width: 60 }]}>2B</Text><Text style={[styles.tableHeaderCell, { width: 60 }]}>3B</Text>
                        <Text style={[styles.tableHeaderCell, { width: 60 }]}>HR</Text><Text style={[styles.tableHeaderCell, { width: 60 }]}>RBI</Text>
                      </View>
                      {selectedPlayerIds.map((id, index) => {
                        const player = teamUsers.find(u => u.id === id); if (!player) return null;
                        return (
                          <View key={id} style={styles.tableDataRow}>
                            <Text style={[styles.tableDataCell, { width: 115, fontWeight: 'bold' }]} numberOfLines={1}>
                              {/* 🌟 벤치나 아웃이면 타순 번호를 숨김 */}
                              <Text style={{color: '#94a3b8', fontSize: 11}}>
                                {boxScore[id]?.position === 'bench' || boxScore[id]?.position === 'OUT' ? '' : `${index + 1}.`}
                              </Text> {player.name} <Text style={{fontSize: 10, color: '#64748b'}}>({player.backNumber})</Text>
                            </Text>
                            <Text style={[styles.tableDataCell, { width: 70, textAlign: 'center', color: '#0f172a', fontWeight: 'bold' }]}>{boxScore[id]?.position || '-'}</Text>
                            <Text style={[styles.tableDataCell, { width: 60, textAlign: 'center' }]}>{boxScore[id]?.atBats || 0}</Text>
                            <Text style={[styles.tableDataCell, { width: 60, textAlign: 'center' }]}>{boxScore[id]?.runs || 0}</Text>
                            <Text style={[styles.tableDataCell, { width: 60, textAlign: 'center' }]}>{boxScore[id]?.hits || 0}</Text>
                            <Text style={[styles.tableDataCell, { width: 60, textAlign: 'center' }]}>{boxScore[id]?.doubles || 0}</Text>
                            <Text style={[styles.tableDataCell, { width: 60, textAlign: 'center' }]}>{boxScore[id]?.triples || 0}</Text>
                            <Text style={[styles.tableDataCell, { width: 60, textAlign: 'center' }]}>{boxScore[id]?.homeRuns || 0}</Text>
                            <Text style={[styles.tableDataCell, { width: 60, textAlign: 'center' }]}>{boxScore[id]?.rbi || 0}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.card}><Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', fontStyle: 'italic' }}>라이브 라인업이 없습니다.</Text></View>
              )}

              {renderSeasonStandings()}
            </View>
          )}

          {/* --- 감독 (Admin) 화면 --- */}
          {userRole === 'admin' && (
            <View>
              {renderNextGameDisplay()}

              <View style={styles.card}>
                <Text style={styles.scheduleTitle}>📢 다음 경기 일정 공지 및 푸시 알림</Text>
                
                <View style={{flexDirection: 'row'}}>
                  <CustomPicker label="월" options={MONTH_OPTIONS} selectedValue={noticeMonth} onValueChange={setNoticeMonth} flex={1} marginRight={6} />
                  <CustomPicker label="일" options={DAY_OPTIONS} selectedValue={noticeDay} onValueChange={setNoticeDay} flex={1} marginRight={6} />
                  <CustomPicker label="시간" options={TIME_OPTIONS} selectedValue={noticeTime} onValueChange={setNoticeTime} flex={1} />
                </View>
                
                <CustomPicker label="구장 위치 선택" options={LOCATION_OPTIONS} selectedValue={noticeLocation} onValueChange={setNoticeLocation} />
                <CustomPicker label="상대 팀 선택" options={OPPONENT_OPTIONS} selectedValue={noticeOpponent} onValueChange={setNoticeOpponent} />

                <TouchableOpacity style={[styles.button, {marginTop: 4}]} onPress={handleUpdateSchedule}>
                  <Text style={styles.buttonText}>선수들에게 알림 전송</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>경기 라인업 추가</Text>
                
                <View style={styles.rowInputs}>
                  <CustomPicker label="출전 팀" options={['1팀', '2팀']} selectedValue={selectedGameTeam} onValueChange={setSelectedGameTeam} flex={1} marginRight={6} />
                  <CustomPicker label="상대 팀명" options={OPPONENT_OPTIONS} selectedValue={gameOpponent} onValueChange={setGameOpponent} flex={1.3} marginRight={6} />
                  <TextInput style={[styles.input, {flex: 1}]} placeholder="경기 차수" keyboardType="numeric" value={gameNumber} onChangeText={setGameNumber} />
                </View>
                
                <View style={styles.rowInputs}>
                  <CustomPicker label="월" options={MONTH_OPTIONS} selectedValue={gameMonth} onValueChange={setGameMonth} flex={1} marginRight={6} />
                  <CustomPicker label="일" options={DAY_OPTIONS} selectedValue={gameDay} onValueChange={setGameDay} flex={1} marginRight={6} />
                  <CustomPicker label="시간" options={TIME_OPTIONS} selectedValue={gameTime} onValueChange={setGameTime} flex={1} />
                </View>

                <Text style={[styles.rosterSectionTitle, {marginTop: 10}]}>멤버 선택</Text>
                <View style={{flexDirection: 'row', flexWrap: 'wrap', marginVertical: 6}}>
                  {teamUsers.filter(u => u.status === 'approved' && u.role !== 'admin').map(u => {
                    const isSelected = selectedPlayerIds.includes(u.id);
                    return (
                      <TouchableOpacity key={u.id} style={[styles.playerChip, isSelected && styles.playerChipActive]} onPress={() => togglePlayerSelection(u.id)}>
                        <Text style={[styles.playerChipText, isSelected && styles.playerChipTextActive]}>{u.name}({u.backNumber})</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {selectedPlayerIds.length > 0 && (
                <View style={styles.card}>
                  <Text style={[styles.cardTitle, {marginBottom: 2}]}> 라인업 / 스탯 입력창</Text>
                  <Text style={{fontSize: 11, color: '#64748b', marginBottom: 10}}>* 스크롤하여 모든 스탯을 조작하세요.</Text>
                  <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                    <View style={{flexDirection: 'column', minHeight: selectedPlayerIds.length * 50 + 80}}> 
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableHeaderCell, { width: 115, textAlign: 'left' }]}>타순 / 선수명</Text>
                        <Text style={[styles.tableHeaderCell, { width: 80 }]}>포지션</Text>
                        <Text style={[styles.tableHeaderCell, { width: 95 }]}>AB(타석)</Text><Text style={[styles.tableHeaderCell, { width: 95 }]}>R(득점)</Text>
                        <Text style={[styles.tableHeaderCell, { width: 95 }]}>H(안타)</Text><Text style={[styles.tableHeaderCell, { width: 95 }]}>2B(2루타)</Text>
                        <Text style={[styles.tableHeaderCell, { width: 95 }]}>3B(3루타)</Text><Text style={[styles.tableHeaderCell, { width: 95 }]}>HR(홈런)</Text>
                        <Text style={[styles.tableHeaderCell, { width: 95 }]}>RBI(타점)</Text>
                      </View>
                      {selectedPlayerIds.map((id, index) => {
                        const player = teamUsers.find(u => u.id === id); if (!player) return null;
                        return (
                          <View key={id} style={[
                            styles.tableDataRow, 
                            { zIndex: activePositionUserId === id ? 999 : 1 },
                            swapTargetId === id && { backgroundColor: '#e2e8f0' } 
                          ]}>
                            <TouchableOpacity 
                              style={{ width: 115, justifyContent: 'center' }} 
                              onPress={() => handlePlayerTap(id)}
                            >
                              <Text style={[styles.tableDataCell, { fontWeight: 'bold' }]} numberOfLines={1}>
                                {/* 🌟 벤치나 아웃이면 타순 번호를 숨김 */}
                                <Text style={{color: '#94a3b8', fontSize: 11}}>
                                  {boxScore[id]?.position === 'bench' || boxScore[id]?.position === 'OUT' ? '' : `${index + 1}.`}
                                </Text> {player.name} <Text style={{fontSize: 10, color: '#64748b'}}>({player.backNumber})</Text>
                              </Text>
                            </TouchableOpacity>
                            
                            <View style={{ width: 80, paddingRight: 5, position: 'relative' }}>
                              <TouchableOpacity 
                                style={styles.tablePickerBtn}
                                onPress={() => setActivePositionUserId(activePositionUserId === id ? null : id)}
                              >
                                <Text style={styles.tablePickerBtnText} numberOfLines={1}>
                                  {boxScore[id]?.position || '선택'}
                                </Text>
                                <Text style={{ fontSize: 8, color: '#94a3b8' }}>▼</Text>
                              </TouchableOpacity>
                              
                              {activePositionUserId === id && (
                                <View style={styles.tablePickerDropdown}>
                                  <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                                    {POSITION_OPTIONS.map((pos) => (
                                      <TouchableOpacity 
                                        key={pos} 
                                        style={styles.tablePickerOption}
                                        onPress={() => {
                                          handlePositionChange(id, pos);
                                          setActivePositionUserId(null); 
                                        }}
                                      >
                                        <Text style={styles.tablePickerOptionText}>{pos}</Text>
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                </View>
                              )}
                            </View>

                            {['atBats', 'runs', 'hits', 'doubles', 'triples', 'homeRuns', 'rbi'].map(field => (
                              <View key={field} style={[styles.counterContainer, { width: 95 }]}>
                                <TouchableOpacity style={styles.counterBtn} onPress={() => adjustStat(id, field, -1)}><Text style={styles.counterBtnText}>-</Text></TouchableOpacity>
                                <Text style={styles.counterValue}>{boxScore[id]?.[field] || 0}</Text>
                                <TouchableOpacity style={styles.counterBtn} onPress={() => adjustStat(id, field, 1)}><Text style={styles.counterBtnText}>+</Text></TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                  <View style={{flexDirection: 'row', marginTop: 16}}>
                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#64748b', marginRight: 8}]} onPress={handleSaveDraft}><Text style={styles.actionBtnText}>💾 SAVE</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#1d4ed8'}]} onPress={handleSendFinal}><Text style={styles.actionBtnText}>🚀 SEND</Text></TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.card}>
                <Text style={styles.adminTitle}>팀원 활동 관리</Text>
                <Text style={styles.rosterSectionTitle}>가입 대기자 명단</Text>
                {teamUsers.filter(u => u.status === 'pending').map(u => (
                  <View key={u.id} style={styles.rosterRow}>
                    <Text style={styles.rosterName}>No.{u.backNumber} {u.name}</Text>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleUpdateUserStatus(u.id, 'approved', u.name)}><Text style={styles.btnTextSmall}>승인</Text></TouchableOpacity>
                  </View>
                ))}
                {teamUsers.filter(u => u.status === 'pending').length === 0 && <Text style={styles.emptyText}>대기자 없음</Text>}
                <View style={styles.divider} />
                <Text style={styles.rosterSectionTitle}>현역 로스터</Text>
                {teamUsers.filter(u => u.status === 'approved' && u.role !== 'admin').map(u => (
                  <View key={u.id} style={styles.rosterRow}>
                    <Text style={styles.rosterName}>No.{u.backNumber} {u.name}</Text>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleUpdateUserStatus(u.id, 'inactive', u.name)}><Text style={styles.btnTextSmall}>비활성화</Text></TouchableOpacity>
                  </View>
                ))}
              </View>

              {renderSeasonStandings()}

            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centerContainer: { flex: 1, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginToggleBar: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 12, alignItems: 'center', justifyContent: 'space-between' },
  toggleText: { color: '#94a3b8', fontSize: 13 },
  logoutBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#ef4444' },
  logoutBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  scrollContainer: { padding: 14 },
  appTitle: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
  
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10 },
  gameInfo: { fontSize: 14, color: '#334155', marginBottom: 6, fontWeight: '500' },
  scheduleTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  adminTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  rosterSectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 10, marginBottom: 10, fontSize: 14, color: '#334155' },
  rowInputs: { flexDirection: 'row' },
  button: { backgroundColor: '#1d4ed8', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  
  seasonChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: '#f1f5f9', marginLeft: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  seasonChipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  seasonChipText: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
  seasonChipTextActive: { color: '#ffffff' },

  playerChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e2e8f0', marginRight: 6, marginBottom: 6 },
  playerChipActive: { backgroundColor: '#2563eb' },
  playerChipText: { fontSize: 12, color: '#475569' },
  playerChipTextActive: { color: '#ffffff', fontWeight: 'bold' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 8, borderBottomWidth: 2, borderColor: '#cbd5e1', paddingHorizontal: 4 },
  tableHeaderCell: { fontSize: 12, fontWeight: 'bold', color: '#475569', textAlign: 'center' },
  tableDataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 4 },
  tableDataCell: { fontSize: 13, color: '#0f172a' },
  tableTextInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6, fontSize: 12, textAlign: 'center', color: '#333' },
  counterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  counterBtn: { width: 24, height: 24, borderRadius: 4, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  counterBtnText: { fontSize: 14, fontWeight: 'bold', color: '#475569' },
  counterValue: { width: 28, textAlign: 'center', fontSize: 13, fontWeight: 'bold', color: '#333' },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  
  rosterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  rosterName: { fontSize: 13, color: '#334155' },
  approveBtn: { backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  rejectBtn: { backgroundColor: '#94a3b8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  btnTextSmall: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  emptyText: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic', marginBottom: 4 },

  tablePickerBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 28
  },
  tablePickerBtnText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
  },
  tablePickerDropdown: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 5,
  },
  tablePickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tablePickerOptionText: {
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
  }
});